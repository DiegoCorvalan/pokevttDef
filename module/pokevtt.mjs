// Import document classes.
import { PokevttActor } from './documents/actor.mjs';
import { PokevttItem } from './documents/item.mjs';
// Import sheet classes.
import { PokevttActorSheet } from './sheets/actor-sheet.mjs';
import { PokevttItemSheet } from './sheets/item-sheet.mjs';
// Import helper/utility classes and constants.
import { preloadHandlebarsTemplates } from './helpers/templates.mjs';
import { POKEVTT } from './helpers/config.mjs';

/* -------------------------------------------- */
/*  Init Hook                                   */
/* -------------------------------------------- */

Hooks.once('init', function () {
  // Add utility classes to the global game object so that they're more easily
  // accessible in global contexts.
  game.pokevtt = {
    PokevttActor,
    PokevttItem,
    rollItemMacro,
  };

  // Add custom constants for configuration.
  CONFIG.POKEVTT = POKEVTT;

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: '1d10 + @des.mod',
    decimals: 2,
  };

  // Define custom Document classes
  CONFIG.Actor.documentClass = PokevttActor;
  CONFIG.Item.documentClass = PokevttItem;

  // Active Effects are never copied to the Actor,
  // but will still apply to the Actor from within the Item
  // if the transfer property on the Active Effect is true.
  CONFIG.ActiveEffect.legacyTransferral = false;

  // Register sheet application classes
  Actors.unregisterSheet('core', ActorSheet);
  Actors.registerSheet('pokevtt', PokevttActorSheet, {
    makeDefault: true,
    label: 'POKEVTT.SheetLabels.Actor',
  });
  Items.unregisterSheet('core', ItemSheet);
  Items.registerSheet('pokevtt', PokevttItemSheet, {
    makeDefault: true,
    label: 'POKEVTT.SheetLabels.Item',
  });

  // Preload Handlebars templates.
  return preloadHandlebarsTemplates();
});

/* -------------------------------------------- */
/*  Handlebars Helpers                          */
/* -------------------------------------------- */

// If you need to add Handlebars helpers, here is a useful example:
Handlebars.registerHelper('toLowerCase', function (fue) {
  return fue.toLowerCase();
});

/* -------------------------------------------- */
/*  Ready Hook                                  */
/* -------------------------------------------- */

Hooks.once('ready', async function () {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on('hotbarDrop', (bar, data, slot) => createItemMacro(data, slot));

  // Setting for the event actor
  game.settings.register('pokevtt', 'eventActorId', {
    name: 'Event Actor ID',
    scope: 'world',
    config: false,
    type: String,
    default: '',
  });

  let eventActorId = game.settings.get('pokevtt', 'eventActorId');
  let eventActor = game.actors.get(eventActorId);

  if (!eventActor) {
    console.log("POKEVTT | Creating special event actor 'Entrenadores'");
    const actorData = {
        name: 'Entrenadores',
        type: 'pokemon',
        img: 'worlds/poo/Imagenes/Sprites/Generico37.png', // Custom image
        system: {
            abilities: {
                fue: { value: 0, bono: 0 },
                des: { value: 0, bono: 0 },
                int: { value: 0, bono: 0 },
            },
            defensa: { value: 0, bono: 0 },
            vida: { value: 1, max: 1, bono: 0 }
        }
    };
    eventActor = await Actor.create(actorData);
    await game.settings.set('pokevtt', 'eventActorId', eventActor.id);
  }
});

/* -------------------------------------------- */
/*  Combat Hooks                                */
/* -------------------------------------------- */

Hooks.on('createCombat', async (combat, options, userId) => {
  // Only run for the user who created the combat
  if (userId !== game.user.id) return;

  console.log("POKEVTT | New combat created. Adding 'Entrenadores' event.");
  const eventActorId = game.settings.get('pokevtt', 'eventActorId');
  if (!eventActorId) {
      ui.notifications.error("POKEVTT | Could not find the special event actor ID.");
      return;
  }

  const eventActor = game.actors.get(eventActorId);
  if (!eventActor) {
      ui.notifications.error("POKEVTT | Could not find the special event actor.");
      return;
  }

  // Check if the combatant is already there to prevent duplicates
  const existing = combat.combatants.find(c => c.actorId === eventActor.id);
  if (existing) return;

  // Create and add the new combatant
  const combatantData = {
      actorId: eventActor.id,
      hidden: false
  };
  
  const [combatant] = await combat.createEmbeddedDocuments("Combatant", [combatantData]);
  
  // Update the combatant's initiative to 0
  await combat.setInitiative(combatant.id, 0);

  console.log("POKEVTT | 'Entrenadores' event added to combat with initiative 0.");
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createItemMacro(data, slot) {
  // First, determine if this is a valid owned item.
  if (data.type !== 'Item') return;
  if (!data.uuid.includes('Actor.') && !data.uuid.includes('Token.')) {
    return ui.notifications.warn(
      'You can only create macro buttons for owned Items'
    );
  }
  // If it is, retrieve it based on the uuid.
  const item = await Item.fromDropData(data);

  // Create the macro command using the uuid.
  const command = `game.pokevtt.rollItemMacro("${data.uuid}");`;
  let macro = game.macros.find(
    (m) => m.name === item.name && m.command === command
  );
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: 'script',
      img: item.img,
      command: command,
      flags: { 'pokevtt.itemMacro': true },
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemUuid
 */
function rollItemMacro(itemUuid) {
  // Reconstruct the drop data so that we can load the item.
  const dropData = {
    type: 'Item',
    uuid: itemUuid,
  };
  // Load the item from the uuid.
  Item.fromDropData(dropData).then((item) => {
    // Determine if the item loaded and if it's an owned item.
    if (!item || !item.parent) {
      const itemName = item?.name ?? itemUuid;
      return ui.notifications.warn(
        `Could not find item ${itemName}. You may need to delete and recreate this macro.`
      );
    }

    // Trigger the item roll
    item.roll();
  });
}

/* -------------------------------------------- */
/*  Actor Hooks                                 */
/* -------------------------------------------- */

Hooks.on('deleteActor', async (actor, options, userId) => {
    if (actor.type === 'pokemon') {
        console.log(`POKEVTT | Pokémon ${actor.name} deleted. Checking trainers.`);
        const trainers = game.actors.filter(a => a.type === 'entrenador');
        const updates = [];

        for (const trainer of trainers) {
            const equipo = trainer.system.equipo || [];
            const pc = trainer.system.pc || [];

            const newEquipo = equipo.filter(id => id !== actor.id);
            const newPc = pc.filter(id => id !== actor.id);

            // Check if there were any changes
            if (newEquipo.length !== equipo.length || newPc.length !== pc.length) {
                console.log(`POKEVTT | Removing ${actor.name} from trainer ${trainer.name}.`);
                updates.push({
                    _id: trainer.id,
                    'system.equipo': newEquipo,
                    'system.pc': newPc
                });
            }
        }

        if (updates.length > 0) {
            await Actor.updateDocuments(updates);
            console.log(`POKEVTT | Finished cleaning up trainer references.`);
        }
    }
});
