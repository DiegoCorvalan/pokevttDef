import {
  onManageActiveEffect,
  prepareActiveEffectCategories,
} from '../helpers/effects.mjs';

/**
 * Extend the basic ItemSheet with some very simple modifications
 * @extends {ItemSheet}
 */
export class PokevttItemSheet extends ItemSheet {
  /** @override */
  static get defaultOptions() {
    return foundry.utils.mergeObject(super.defaultOptions, {
      classes: ['pokevtt', 'sheet', 'item'],
      width: 520,
      height: 480,
      tabs: [
        {
          navSelector: '.sheet-tabs',
          contentSelector: '.sheet-body',
          initial: 'description',
        },
      ],
    });
  }

  /** @override */
  get template() {
    const path = 'systems/pokevtt/templates/item';
    // Return a single sheet for all item types.
    // return `${path}/item-sheet.hbs`;

    // Alternatively, you could use the following return statement to do a
    // unique item sheet by type, like `weapon-sheet.hbs`.
    return `${path}/item-${this.item.type}-sheet.hbs`;
  }

  /* -------------------------------------------- */

  /** @override */
  async getData() {
    const context = super.getData();

    // Use a safe clone of the item data for further operations.
    const itemData = this.document.toObject(false);

    // Enrich description info for display
    // Enrichment turns text like `[[/r 1d20]]` into buttons
    context.enrichedDescription = await TextEditor.enrichHTML(
      this.item.system.description,
      {
        // Whether to show secret blocks in the finished html
        secrets: this.document.isOwner,
        // Necessary in v11, can be removed in v12
        async: true,
        // Data to fill in for inline rolls
        rollData: this.item.getRollData(),
        // Relative UUID resolution
        relativeTo: this.item,
      }
    );

    // Add the item's data to context.data for easier access, as well as flags.
    context.system = itemData.system;
    context.flags = itemData.flags;

    // Add actor attributes if this is a feature
    if (this.item.type === 'feature') {
      // Get the actor's attributes if this item belongs to an actor
      if (this.item.actor) {
        context.actorAttributes = this.item.actor.system.abilities;
      }
      // Add CONFIG reference
      context.config = CONFIG.POKEVTT;
    }

    // Prepare active effects for easier access
    context.effects = prepareActiveEffectCategories(this.item.effects);

    return context;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.isEditable) return;

    // Roll handlers, click handlers, etc. would go here.
    html.find('.rollable').click(this._onRoll.bind(this));

    // Active Effect management
    html.on('click', '.effect-control', (ev) =>
      onManageActiveEffect(ev, this.item)
    );

    // Actualizar la imagen cuando cambie el tipo
    html.find('select[name="system.moveType"]').change(ev => {
      const moveType = ev.currentTarget.value;
      const img = html.find('img.profile-img');
      img.attr('src', `systems/pokevtt/icons/${moveType}.png`);
    });
  }

  async _onRoll(event) {
    event.preventDefault();
    const item = this.item;

    // Construir la fórmula de tirada
    const diceNum = item.system.roll.diceNum || 1;
    const diceSize = item.system.roll.diceSize || "d6";
    const diceBonus = item.system.roll.diceBonus || "";
    
    const formula = `${diceNum}${diceSize}${diceBonus ? " + " + diceBonus : ""}`;

    // Crear la tirada
    let roll = new Roll(formula);
    
    // Ejecutar la tirada
    await roll.evaluate({async: true});

    // Crear el mensaje en el chat
    const messageData = {
      speaker: ChatMessage.getSpeaker({ actor: this.actor }),
      flavor: `${item.name}`,
      roll: roll,
      rollMode: game.settings.get('core', 'rollMode'),
      type: CONST.CHAT_MESSAGE_TYPES.ROLL
    };

    // Enviar el mensaje al chat
    await ChatMessage.create(messageData);

    return roll;
  }
}
