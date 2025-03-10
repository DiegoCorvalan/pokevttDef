import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from '../helpers/effects.mjs';

/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class PokevttActorSheet extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['pokevtt', 'sheet', 'actor'],
      width: 700,
      height: 600,
      tabs: [
        {
          navSelector: '.sheet-tabs',
          contentSelector: '.sheet-body',
          initial: 'features',
        }, 
      ],
    });
  }

  /** @override */
  get template() {
    return `systems/pokevtt/templates/actor/actor-${this.actor.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    const context = super.getData();

    // Use a safe clone of the actor data for further operations.
    const actorData = this.actor.toObject(false);

    // Add the actor's data to context.data for easier access, as well as flags.
    context.system = actorData.system;
    context.flags = actorData.flags;

    // Adding a pointer to CONFIG.POKEVTT
    context.config = CONFIG.POKEVTT;

    // Prepare character data and items.
    if (actorData.type == 'entrenador') {
      this._prepareItems(context);
      this._prepareEntrenadorData(context);
    }

    // Prepare NPC data and items.
    if (actorData.type == 'pokemon') {
      this._prepareItems(context);
      // Enrich the pokedex text
      context.enrichedPokedex = await TextEditor.enrichHTML(this.actor.system.pokedex, {
        secrets: this.actor.isOwner,
        async: true,
        relativeTo: this.actor,
        rollData: context.rollData
      });
    }

    // Add roll data for TinyMCE editors.
    context.rollData = context.actor.getRollData();

    // Prepare active effects
    context.effects = prepareActiveEffectCategories(this.actor.effects);

    // Enrich the biography text
    context.enrichedBiography = await TextEditor.enrichHTML(this.actor.system.historia, {
      secrets: this.actor.isOwner,
      async: true,
      relativeTo: this.actor,
      rollData: context.rollData
    });

    return context;
  }

  /**
   * Entrenador-specific context modifications
   *
   * @param {object} context The context object to mutate
   */
  _prepareEntrenadorData(context) {
    // This is where you can enrich entrenador-specific editor fields
    // or setup anything else that's specific to this type
  }

  /**
   * Organize and classify Items for Actor sheets.
   *
   * @param {object} context The context object to mutate
   */
  _prepareItems(context) {
    // Initialize containers.
    const gear = [];
    const features = [];

    // Iterate through items, allocating to containers
    for (let i of context.items) {
      i.img = i.img || Item.DEFAULT_ICON;
      // Append to gear.
      if (i.type === 'item') {
        gear.push(i);
      }
      // Append to features.
      else if (i.type === 'feature') {
        features.push(i);
      }
    }

    // Assign and return
    context.gear = gear;
    context.features = features;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // -------------------------------------------------------------
    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Add Inventory Item
    html.on('click', '.item-create', this._onItemCreate.bind(this));

    // Edit Inventory Item
    html.on('click', '.item-edit', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.on('click', '.item-delete', (ev) => {
      const li = $(ev.currentTarget).parents('.item');
      const item = this.actor.items.get(li.data('itemId'));
      item.delete();
      li.slideUp(200, () => this.render(false));
    });

    // Active Effect management
    html.on('click', '.effect-control', (ev) => {
      const row = ev.currentTarget.closest('li');
      const document =
        row.dataset.parentId === this.actor.id
          ? this.actor
          : this.actor.items.get(row.dataset.parentId);
      onManageActiveEffect(ev, document);
    });

    // Rollable abilities.
    html.on('click', '.rollable', this._onRoll.bind(this));

    html.on('click', '.use-item-button', async (event) => {
      console.log("Botón de uso de ítem presionado");
      event.preventDefault();
    
      // Obtener el ítem que se está usando
      const itemId = event.currentTarget.closest('.item').dataset.itemId;
      const item = this.actor.items.get(itemId);
      
      console.log("Item seleccionado:", item);

      if (!item) {
        console.warn("No se encontró el ítem");
        return;
      }

      // Enriquecer la descripción
      const enrichedDescription = await TextEditor.enrichHTML(item.system.description, {
        async: true,
        relativeTo: item
      });

      let content = `
        <h2>${item.name} <span style="font-size: 0.8em; color: #666;">(${CONFIG.POKEVTT.types[item.system.moveType]})</span></h2>
        <hr>
        ${enrichedDescription}
      `;

      // Mostrar dificultad si está habilitada
      if (item.system.hasDifficulty) {
        const diffAttrKey = item.system.difficultyAttribute;
        const defenseAttrKey = item.system.defenseAttribute;
        const difficultyBase = parseInt(item.system.difficultyBase || "5");
        
        if (!diffAttrKey || !defenseAttrKey) {
          console.warn("Falta seleccionar un atributo para la dificultad");
          ui.notifications.warn("Este ítem necesita tener configurados los atributos de dificultad y defensa.");
          return;
        }
        
        const attrMod = this.actor.system.abilities?.[diffAttrKey]?.mod || 0;
        const difficulty = attrMod + difficultyBase;
        
        let difficultyText = "";
        switch(difficultyBase) {
          case 3:
            difficultyText = "Fácil";
            break;
          case 5:
            difficultyText = "Normal";
            break;
          case 8:
            difficultyText = "Difícil";
            break;
          default:
            difficultyText = "Normal";
        }
        
        content += `
          <hr>
          <div class="dice-roll difficulty-roll">
            <div class="dice-result">
              <h4>Dificultad ${difficultyText}</h4>
              <div class="dice-formula">${defenseAttrKey} vs ${difficulty}</div>
            </div>
          </div>
        `;
      }

      // Tirada de ataque si está habilitada
      if (item.system.hasAttackRoll) {
        const attributeKey = item.system.attributeModifier;
        if (!attributeKey) {
          console.warn("Ningún atributo seleccionado en el ítem");
          ui.notifications.warn("Este ítem no tiene un atributo seleccionado.");
          return;
        }
        const attributeMod = this.actor.system.abilities?.[attributeKey]?.mod || 0;
        const attackRoll = await new Roll(`1d10+${attributeMod}`).roll();
        
        content += `
          <hr>
          <div class="dice-roll attack-roll">
            <div class="dice-result">
              <h4>Tirada de ataque</h4>
              <div class="dice-total">${attackRoll.total}</div>
            </div>
          </div>
        `;
      }

      // Tirada de daño si está habilitada
      if (item.system.hasDamageRoll) {
        const diceNum = item.system.roll.diceNum || 1;
        const diceSize = item.system.roll.diceSize || "6";
        const damageRoll = await new Roll(`${diceNum}d${diceSize}`).roll();
        
        content += `
          <hr>
          <div class="dice-roll damage-roll">
            <div class="dice-result">
              <h4>Daño</h4>
              <div class="dice-total">${damageRoll.total}</div>
            </div>
          </div>
        `;
      }
      
      // Enviar el mensaje combinado
      await ChatMessage.create({
        content: content,
        speaker: ChatMessage.getSpeaker({ actor: this.actor })
      });
    });
    
    // Drag events for features
    if (this.actor.isOwner) {
      let handler = ev => this._onDragStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }

    // Edit button functionality
    html.find('#editButton').click(event => {
      event.preventDefault();
      const hiddenContent = html.find('.hidden-content');
      if (hiddenContent.css('display') === 'none') {
        hiddenContent.show();
        event.currentTarget.innerHTML = '<i class="fas fa-save"></i>';
      } else {
        hiddenContent.hide();
        event.currentTarget.innerHTML = '<i class="fas fa-edit"></i>';
      }
    });

    // Agregar Pokémon
    html.find('.add-pokemon').click(async (ev) => {
      const destination = ev.currentTarget.dataset.destination;
      
      // Verificar límite del equipo
      if (destination === 'equipo' && this.actor.system.equipo.length >= 4) {
        ui.notifications.warn("El equipo no puede tener más de 4 Pokémon");
        return;
      }

      // Filtrar solo Pokémon que el jugador puede ver y controlar
      const pokemonActors = game.actors.filter(a => 
        a.type === 'pokemon' && 
        !this.actor.system[destination].includes(a.id) &&
        a.testUserPermission(game.user, "OWNER")  // Verifica permisos de propietario
      );
      
      if (pokemonActors.length === 0) {
        ui.notifications.warn("No hay Pokémon disponibles para agregar");
        return;
      }

      const dialog = new Dialog({
        title: `Agregar Pokémon al ${destination === 'equipo' ? 'Equipo' : 'PC'}`,
        content: `
          <form>
            <div class="form-group">
              <label>Seleccionar Pokémon:</label>
              <select name="pokemonId">
                ${pokemonActors.map(a => `<option value="${a.id}">${a.name}</option>`).join('')}
              </select>
            </div>
          </form>
        `,
        buttons: {
          add: {
            icon: '<i class="fas fa-plus"></i>',
            label: "Agregar",
            callback: async (html) => {
              const pokemonId = html.find('[name="pokemonId"]').val();
              const pokemon = game.actors.get(pokemonId);
              
              // Verificar permisos nuevamente por seguridad
              if (!pokemon.testUserPermission(game.user, "OWNER")) {
                ui.notifications.error("No tienes permiso para agregar este Pokémon");
                return;
              }

              const currentList = this.actor.system[destination];
              await this.actor.update({
                [`system.${destination}`]: [...currentList, pokemonId]
              });
            }
          }
        }
      });
      dialog.render(true);
    });

    // Mover Pokémon entre equipo y PC
    html.find('.move-to-pc').click(async (ev) => {
      const pokemonId = ev.currentTarget.closest('.pokemon-entry').dataset.pokemonId;
      const equipo = this.actor.system.equipo.filter(id => id !== pokemonId);
      const pc = [...this.actor.system.pc, pokemonId];
      await this.actor.update({
        'system.equipo': equipo,
        'system.pc': pc
      });
    });

    html.find('.move-to-team').click(async (ev) => {
      if (this.actor.system.equipo.length >= 4) {
        ui.notifications.warn("El equipo no puede tener más de 4 Pokémon");
        return;
      }
      
      const pokemonId = ev.currentTarget.closest('.pokemon-entry').dataset.pokemonId;
      const pc = this.actor.system.pc.filter(id => id !== pokemonId);
      const equipo = [...this.actor.system.equipo, pokemonId];
      await this.actor.update({
        'system.equipo': equipo,
        'system.pc': pc
      });
    });

    // Eliminar Pokémon
    html.find('.remove-pokemon').click(async (ev) => {
      const pokemonEntry = ev.currentTarget.closest('.pokemon-entry');
      const pokemonId = pokemonEntry.dataset.pokemonId;
      const destination = pokemonEntry.closest('.equipo') ? 'equipo' : 'pc';
      const currentList = this.actor.system[destination].filter(id => id !== pokemonId);
      await this.actor.update({
        [`system.${destination}`]: currentList
      });
    });

    // Hacer que los Pokémon sean arrastrables
    html.find('.pokemon-entry').each((i, li) => {
      li.setAttribute('draggable', true);
      li.addEventListener('dragstart', this._onDragPokemon.bind(this));
    });

    // Actualizar iconos cuando cambien los tipos
    html.find('select[name^="system.types"]').change(ev => {
      const select = ev.currentTarget;
      const type = select.value;
      const icon = select.closest('.type-container').querySelector('.type-icon');
      icon.src = `systems/pokevtt/icons/${type || 'normal'}.png`;
    });
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  async _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      system: data,
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.system['type'];

    // Finally, create the item!
    return await Item.create(itemData, { parent: this.actor });
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  async _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;

    // Handle item rolls.
    if (dataset.rollType) {
      if (dataset.rollType == 'item') {
        const itemId = element.closest('.item').dataset.itemId;
        const item = this.actor.items.get(itemId);
        if (item) {
          // Construir la fórmula de tirada
          const diceNum = item.system.roll.diceNum ?? 0;
          const diceSize = item.system.roll.diceSize || "d6";
          const diceBonus = item.system.roll.diceBonus || "";
          
          // Construir la fórmula
          let formula;
          if (diceNum > 0) {
            formula = `${diceNum}${diceSize}${diceBonus ? " + " + diceBonus : ""}`;
          } else if (diceBonus) {
            formula = diceBonus; // Si solo hay modificador, usar ese valor
          }

          try {
            // Preparar el contenido del mensaje
            let content = `<h2>${item.name}</h2>`;
            if (item.system.description) {
              content += `<div class="item-description">${item.system.description}</div>`;
            }

            // Si hay fórmula (dados o modificador), hacer la tirada
            if (formula) {
              let roll = new Roll(formula);
              await roll.evaluate({async: true});
              
              await ChatMessage.create({
                speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                flavor: content,
                roll: roll,
                rollMode: game.settings.get('core', 'rollMode'),
                type: CONST.CHAT_MESSAGE_TYPES.ROLL
              });
            } else {
              // Si no hay ni dados ni modificador, solo mostrar la información
              await ChatMessage.create({
                speaker: ChatMessage.getSpeaker({ actor: this.actor }),
                content: content,
                type: CONST.CHAT_MESSAGE_TYPES.OTHER
              });
            }
          } catch (error) {
            console.error("Error al mostrar el item:", error);
            ui.notifications.error("Hubo un error al mostrar el item");
          }
        }
      }
    }

    // Handle rolls that supply the formula directly.
    if (dataset.roll) {
      let label = dataset.label ? `[ability] ${dataset.label}` : '';
      let roll = new Roll(dataset.roll, this.actor.getRollData());
      roll.toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label,
        rollMode: game.settings.get('core', 'rollMode'),
      });
      return roll;
    }
  }

  // Agregar este nuevo método
  _onDragPokemon(event) {
    const pokemonId = event.currentTarget.dataset.pokemonId;
    const pokemon = game.actors.get(pokemonId);
    
    event.dataTransfer.setData("text/plain", JSON.stringify({
      type: "Actor",
      uuid: pokemon.uuid,
      actorId: pokemon.id,
      tokenData: pokemon.prototypeToken
    }));
  }

  /** @override */
  _onDragStart(event) {
    const li = event.currentTarget;
    if (event.target.classList.contains("content-link")) return;

    // Create drag data
    const dragData = {
      type: "Item",
      actorId: this.actor.id,
      data: this.actor.items.get(li.dataset.itemId)
    };

    // Set data transfer
    event.dataTransfer.setData("text/plain", JSON.stringify(dragData));
  }

  /** @override */
  async _onDrop(event) {
    try {
      const data = JSON.parse(event.dataTransfer.getData("text/plain"));
      console.log("Dropped data:", data); // Para debug

      // Handle item drops
      if (data.type === "Item") {
        let itemData = null;

        // Case 1 - Item from an Actor
        if (data.actorId && data.data) {
          const actor = game.actors.get(data.actorId);
          if (!actor) return;
          const item = actor.items.get(data.data._id);
          if (!item) return;
          itemData = item.toObject();
        }
        // Case 2 - Item from the sidebar
        else if (data.uuid) {
          const item = await fromUuid(data.uuid);
          if (!item) return;
          itemData = item.toObject();
        }
        // Case 3 - Direct item data
        else if (data.data) {
          itemData = data.data;
        }

        if (!itemData) {
          console.error("No valid item data found");
          return;
        }

        // Verificar si es un feature y si el actor es un Pokémon
        if (itemData.type === "feature" && this.actor.type === "pokemon") {
          try {
            await this.actor.createEmbeddedDocuments("Item", [itemData]);
            ui.notifications.info(`${itemData.name} añadido a ${this.actor.name}`);
          } catch (error) {
            console.error(error);
            ui.notifications.error("No se pudo añadir el movimiento");
          }
        } else {
          await this.actor.createEmbeddedDocuments("Item", [itemData]);
        }
      }
    } catch (error) {
      console.error("Error in _onDrop:", error);
      ui.notifications.error("Error al procesar el item arrastrado");
    }
  }
}
