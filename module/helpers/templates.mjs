/**
 * Define a set of template paths to pre-load
 * Pre-loaded templates are compiled and cached for fast access when rendering
 * @return {Promise}
 */
export const preloadHandlebarsTemplates = async function () {
  // Registrar el helper para obtener actores
  Handlebars.registerHelper('getActor', function(actorId) {
    return game.actors.get(actorId);
  });

  return loadTemplates([
    // Actor partials.
    'systems/pokevtt/templates/actor/parts/actor-features.hbs',
    'systems/pokevtt/templates/actor/parts/actor-items.hbs',
    'systems/pokevtt/templates/actor/parts/actor-effects.hbs',
    // Item partials
    'systems/pokevtt/templates/item/parts/item-effects.hbs',
  ]);
};
