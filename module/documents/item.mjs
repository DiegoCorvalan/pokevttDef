/**
 * Extend the basic Item with some very simple modifications.
 * @extends {Item}
 */
export class PokevttItem extends Item {
  /**
   * Augment the basic Item data model with additional dynamic data.
   */
  prepareData() {
    // As with the actor class, items are documents that can have their data
    // preparation methods overridden (such as prepareBaseData()).
    super.prepareData();
  }

  /**
   * Prepare a data object which defines the data schema used by dice roll commands against this Item
   * @override
   */  prepareData() {
    super.prepareData();

    // Si el ítem está asociado a un actor, puedes acceder a sus atributos
    if (this.actor) {
      const actorData = this.actor.system;

      // Ejemplo: Modificar un atributo del ítem basado en un atributo del actor
      this.system.someValue = actorData.abilities.int.value * 2;
    }
  }

  getRollData() {
    const rollData = { ...this.system };

    if (!this.actor) return rollData;

    // Añadir datos del actor a los datos de tirada
    rollData.actor = this.actor.getRollData();


    return rollData;
  }

  async roll() {
    const item = this;
    const speaker = ChatMessage.getSpeaker({ actor: this.actor });
    const rollMode = game.settings.get('core', 'rollMode');
    const label = `[${item.type}] ${item.name}`;

    if (!this.system.formula) {
      ChatMessage.create({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
        content: item.system.description ?? '',
      });
    } else {
      const rollData = this.getRollData();
      const roll = new Roll(rollData.formula, rollData);
      roll.toMessage({
        speaker: speaker,
        rollMode: rollMode,
        flavor: label,
      });
      return roll;
    }
  }
}