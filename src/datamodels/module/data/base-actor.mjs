import PokevttDataModel from "./base-model.mjs";

export default class PokevttActorBase extends PokevttDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;
    const requiredInteger = { required: true, nullable: false, integer: true };
    const schema = {};

    schema.vida = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: -2, min: -2 }),
      max: new fields.NumberField({ ...requiredInteger, initial: -2 })
    });
    schema.defensa = new fields.SchemaField({
      value: new fields.NumberField({ ...requiredInteger, initial: 4}),
    });
    schema.biography = new fields.StringField({ required: true, blank: true }); // equivalent to passing ({initial: ""}) for StringFields

    return schema;
  }

}