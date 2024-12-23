//modules
import type { Directory } from 'ts-morph';
//stackpress
import type Registry from '@stackpress/incept/dist/schema/Registry';

//generators
import generateCreate from './create';
import generateDetail from './detail';
import generateRemove from './remove';
import generateRestore from './restore';
import generateSearch from './search';
import generateUpdate from './update';

export default function generate(directory: Directory, registry: Registry) {
  generateCreate(directory, registry);
  generateDetail(directory, registry);
  generateRemove(directory, registry);
  generateRestore(directory, registry);
  generateSearch(directory, registry);
  generateUpdate(directory, registry);
};