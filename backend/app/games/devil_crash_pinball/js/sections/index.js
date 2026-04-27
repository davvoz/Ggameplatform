/**
 * Section barrel — re-exports the single generic Section class.
 * All section configuration is now data-driven via level JSON files.
 * To add a new floor: add a CONFIG_KEY to SectionRegistry#MANIFEST
 * and supply the corresponding JSON in data/levels/.
 */
export { Section } from './Section.js';
