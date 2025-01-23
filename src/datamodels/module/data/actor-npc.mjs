import PokevttActorBase from "./base-actor.mjs";

export default class PokevttPokemon extends PokevttActorBase {

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = super.defineSchema();
    schema.defensa.final = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 });
    schema.defensa.value = new fields.NumberField({ ...requiredInteger, initial: 4, min: 0 });
    schema.defensa.bono = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 });
    schema.vida.final = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 });
    schema.vida.value = new fields.NumberField({ ...requiredInteger, initial: 4, min: 0 });
    schema.vida.bono = new fields.NumberField({ ...requiredInteger, initial: 0, min: 0 });
    schema.attributes = new fields.SchemaField({
      level: new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: 1 })
      }),
    });

    // Iterate over ability names and create a new SchemaField for each.
    schema.abilities = new fields.SchemaField(Object.keys(CONFIG.POKEVTT.abilities).reduce((obj, ability) => {
      obj[ability] = new fields.SchemaField({
        value: new fields.NumberField({ ...requiredInteger, initial: -2, min: -2 }),
        label: new fields.StringField({ required: true, blank: true })
      });
      return obj;
    }, {}));

    return schema;
  }

  prepareDerivedData() {
    // Loop through ability scores, and add their modifiers to our sheet output.
    for (const key in this.abilities) {
      // Calculate the modifier using d20 rules.
      this.abilities[key].mod = Math.floor(this.abilities[key].value + this.abilities[key].bono);
      // Handle ability label localization.
      this.abilities[key].label = game.i18n.localize(CONFIG.POKEVTT.abilities[key]) ?? key;
    }
    this.defensa.final = this.defensa.value + this.defensa.bono;
    this.vida.final = this.vida.value + this.vida.bono;

  }
  getRollData() {
    const data = {};

    // Copy the ability scores to the top level, so that rolls can use
    // formulas like `@str.mod + 4`.
    if (this.abilities) {
      for (let [k,v] of Object.entries(this.abilities)) {
        data[k] = foundry.utils.deepClone(v);
      }
    }

    data.lvl = this.attributes.level.value;

    return data
  }
}