const slugifyLib = require('slugify');

const createSlug = (text) => {
  return slugifyLib(text, {
    lower: true,
    strict: true,
    trim: true,
    replacement: '-',
  });
};

const createUniqueSlug = async (text, model, field = 'slug', where = {}) => {
  const baseSlug = createSlug(text);
  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await model.findFirst({ where: { [field]: slug, ...where } });
    if (!existing) break;
    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

module.exports = { createSlug, createUniqueSlug };
