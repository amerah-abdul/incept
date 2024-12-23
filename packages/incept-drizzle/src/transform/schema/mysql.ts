//stackpress
import type Column from '@stackpress/incept/dist/schema/Column';
//common
import type { Method, Relations } from '../types';
import { clen, numdata, attr } from '../helpers';

//map from column types to sql types and helpers
export const typemap: Record<string, string> = {
  String: 'string',
  Text: 'text',
  Number: 'number',
  Integer: 'number',
  Float: 'number',
  Boolean: 'boolean',
  Date: 'date',
  Datetime: 'datetime',
  Time: 'time',
  Json: 'json',
  Object: 'json',
  Hash: 'json'
};

export default function mysql(column: Column, relations: Relations) {
  const type = typemap[column.type];
  if (!type && !column.fieldset && !column.enum) {
    return [] as Method[];
  }

  let method: Method = { name: type, args: [ `'${column.name}'` ] };

  //array
  if (column.multiple) {
    method.name = 'json';
  //char, varchar
  } else if (type === 'string') {
    const length = clen(column);
    if (length[0] === length[1]) {
      method = { 
        name: 'char', 
        args: [ 
          `'${column.name}'`, 
          `{ length: ${length[1]} }` 
        ] 
      };
    } else {
      method = { 
        name: 'varchar', 
        args: [ 
          `'${column.name}'`, 
          `{ length: ${length[1]} }` 
        ] 
      };
    }
  //integer, smallint, bigint, float
  } else if (type === 'number') {
    const { minmax, integerLength, decimalLength } = numdata(column);

    if (decimalLength > 0) {
      method = { 
        name: 'float', 
        args: [ 
          `'${column.name}'`, 
          JSON.stringify({
            precision: integerLength + decimalLength,
            scale: decimalLength,
            unsigned: minmax[0] < 0
          }).replaceAll('"', '') 
        ] 
      };
    } else if (integerLength === 1) {
      method = { name: 'smallint', args: [ `'${column.name}'` ] };
    } else if (integerLength > 8) {
      method = { name: 'bigint', args: [ `'${column.name}'` ] };
    } else {
      method = { 
        name: 'integer', 
        args: [ 
          `'${column.name}'`, 
          JSON.stringify({
            precision: integerLength,
            unsigned: minmax[0] < 0
          }).replaceAll('"', '') 
        ] 
      };
    }
  //if it's a fieldset
  } else if (column.fieldset) {
    method.name = 'json';
  } else if (column.enum) {
    method = { 
      name: 'varchar', 
      args: [ 
        `'${column.name}'`, 
        `{ length: 255 }` 
      ] 
    };
  }

  return [ method, ...attr(column, relations) ];
}