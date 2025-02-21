export default class PokevttEntrenador extends foundry.abstract.DataModel {
  /** @inheritdoc */
  static defineSchema() {
    const fields = foundry.data.fields;
    return {
      // ... otros campos existentes ...
      equipo: new fields.ArrayField(new fields.StringField()),
      pc: new fields.ArrayField(new fields.StringField())
    };
  }
} 