'use strict';

// Reject taxonomy collisions before generators can overwrite one list with
// another, including tag_map/category_map entries that share the same slug.
hexo.extend.filter.register('before_generate', function validateTaxonomyPaths() {
  for (const kind of ['tags', 'categories']) {
    const paths = new Map();
    for (const item of this.locals.get(kind).toArray()) {
      if (!item.length) continue; // Old, unreferenced Hexo database entries.
      const key = item.path.normalize('NFC').toLowerCase();
      const previous = paths.get(key);
      if (previous) {
        throw new Error(
          `${kind} "${previous.name}" (${previous.path}) and "${item.name}" (${item.path}) `
          + 'share a case-insensitive path. Normalize the taxonomy names or assign distinct slugs before building.'
        );
      }
      paths.set(key, { name: item.name, path: item.path });
    }
  }
}, 20);

// macOS can merge differently cased directory names even when their final
// filenames differ. Check every directory prefix as well as complete routes
// before Hexo writes the static output; never silently pick a winning page.
hexo.extend.filter.register('after_generate', function validateRouteCasing() {
  const paths = new Map();
  for (const route of this.route.list()) {
    const segments = route.split('/');
    for (let length = 1; length <= segments.length; length++) {
      const prefix = segments.slice(0, length).join('/');
      const key = prefix.normalize('NFC').toLowerCase();
      const previous = paths.get(key);
      if (previous !== undefined && previous !== prefix) {
        throw new Error(
          `Routes "${previous}" and "${prefix}" collide on a case-insensitive filesystem. `
          + 'Fix the source names or taxonomy slugs before generating public/.'
        );
      }
      paths.set(key, prefix);
    }
  }
}, 20);
