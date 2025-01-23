import PokevttDataModel from "./base-model.mjs";

export default class PokevttItemBase extends PokevttDataModel {

  static defineSchema() {
    const fields = foundry.data.fields;
    const schema = {};

    schema.description = new fields.StringField({ required: true, blank: true });

    return schema;
  }

}d