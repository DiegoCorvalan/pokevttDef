/**
 * Extend the base Actor document by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class PokevttActor extends Actor {
  /** @override */
  prepareData() {
    // Prepare data for the actor. Calling the super version of this executes
    // the following, in order: data reset (to clear active effects),
    // prepareBaseData(), prepareEmbeddedDocuments() (including active effects),
    // prepareDerivedData().
    super.prepareData();
  }

  /** @override */
  prepareBaseData() {
    // Data modifications in this step occur before processing embedded
    // documents or derived data.
  }

  /**
   * @override
   * Augment the actor source data with additional dynamic data. Typically,
   * you'll want to handle most of your calculated/derived data in this step.
   * Data calculated in this step should generally not exist in template.json
   * (such as ability modifiers rather than ability scores) and should be
   * available both inside and outside of entrenador sheets (such as if an actor
   * is queried and has a roll executed directly from it).
   */
  prepareDerivedData() {
    const actorData = this;
    const systemData = actorData.system;
    const flags = actorData.flags.pokevtt || {};

    // Make separate methods for each Actor type (entrenador, pokemon, etc.) to keep
    // things organized.
    this._prepareEntrenadorData(actorData);
    this._preparepokemonData(actorData);
  }

  /**
   * Prepare Entrenador type specific data
   */
  _prepareEntrenadorData(actorData) {
    if (actorData.type !== 'entrenador') return;

    // Make modifications to data here. For example:
    const systemData = actorData.system;

    // Loop through ability scores, and add their modifiers to our sheet output.
    for (let [key, ability] of Object.entries(systemData.abilities)) {
      // Calculate the modifier using d20 rules.
      ability = Math.floor(ability.value );
    }

    
  }

  /**
   * Prepare Pokemon type specific data.
   */
  _preparepokemonData(actorData) {
    if (actorData.type !== 'pokemon') return;

    const systemData = actorData.system;

    // Make modifications to data here. For example:
    for (let [key, ability] of Object.entries(systemData.abilities)) {
      // Calculate the modifier using d20 rules.
      ability.mod = Math.floor(ability.value + ability.bono);
    }
    systemData.defensa.final = systemData.defensa.value + systemData.defensa.bono;
    systemData.vida.final = systemData.vida.value + systemData.vida.bono;

}

  /**
   * Override getRollData() that's supplied to rolls.
   */
  getRollData() {
    // Starts off by populating the roll data with a shallow copy of `this.system`
    const data = { ...this.system };

    // Prepare entrenador roll data.
    this._getEntrenadorRollData(data);
    this._getpokemonRollData(data);

    return data;
  }

  /**
   * Prepare entrenador roll data.
   */
  _getEntrenadorRollData(data) {
    if (this.type !== 'entrenador') return;

    // Copy the ability scores to the top level, so that rolls can use
    // formulas like `@fue + 4`.
    if (data.abilities) {
      for (let [k, v] of Object.entries(data.abilities)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    // Add level for easier access, or fall back to 0.
    if (data.attributes.level) {
      data.lvl = data.attributes.level.value ?? 0;
    }
  }

  /**
   * Prepare Pokemon roll data.
   */
  _getpokemonRollData(data) {
    if (this.type !== 'pokemon') return;

    // Process additional Pokemon data here.
  }
}
