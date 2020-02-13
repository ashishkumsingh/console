import * as _ from 'lodash';
import { ObjectEnum } from '../../../constants';
import { omitEmpty } from '../../../utils/basic';
import { Wrapper } from './wrapper';

export abstract class ObjectWithTypePropertyWrapper<
  RESOURCE,
  TYPE extends ObjectEnum<string>,
  COMBINED_TYPE_DATA,
  SELF extends ObjectWithTypePropertyWrapper<RESOURCE, TYPE, COMBINED_TYPE_DATA, SELF>
> extends Wrapper<RESOURCE, SELF> {
  private readonly TypeClass: { getAll: () => TYPE[] | Readonly<TYPE[]> };

  private readonly typeDataPath: string[];

  protected constructor(
    data: RESOURCE | SELF,
    copy = false,
    typeClass: { getAll: () => TYPE[] | Readonly<TYPE[]> },
    typeDataPath: string[] = [],
  ) {
    super(data, copy);
    this.TypeClass = typeClass;
    this.typeDataPath = typeDataPath;
  }

  public getType = (): TYPE =>
    this.TypeClass.getAll().find((type) => this.getIn([...this.typeDataPath, type.getValue()]));

  public getTypeValue = (): string => {
    const type = this.getType();
    return type && type.getValue();
  };

  public hasType = (): boolean => !!this.getType();

  public getTypeData = (type?: TYPE): COMBINED_TYPE_DATA =>
    this.getIn([...this.typeDataPath, (type || this.getType()).getValue()]);

  public mergeWith(...wrappers: SELF[]): SELF {
    super.mergeWith(...wrappers);
    const lastWithType = _.last(wrappers.filter((wrapper) => wrapper?.getType()));

    if (lastWithType) {
      this.appendType(lastWithType.getType(), undefined, false); // removes typeData of other types
    }
    return (this as any) as SELF;
  }

  public setType = (type?: TYPE, typeData?: COMBINED_TYPE_DATA, sanitize = true) => {
    const typeDataParent =
      this.typeDataPath.length === 0 ? this.data : this.getIn(this.typeDataPath);
    if (typeDataParent) {
      this.TypeClass.getAll().forEach(
        (superfluousProperty) => delete typeDataParent[superfluousProperty.getValue()],
      );
      if (type) {
        const finalTypeData = typeData
          ? sanitize
            ? this.sanitize(type, typeData) || {}
            : _.cloneDeep(typeData)
          : {};
        if (sanitize) {
          omitEmpty(finalTypeData, true);
        }
        typeDataParent[type.getValue()] = finalTypeData;
      }
    }
    return (this as any) as SELF;
  };

  public appendType = (type?: TYPE, newTypeData?: COMBINED_TYPE_DATA, sanitize = true) =>
    this.setType(type, { ...this.getTypeData(type), ...newTypeData }, sanitize);

  public setTypeData = (newTypeData?: COMBINED_TYPE_DATA, sanitize = true) =>
    this.setType(this.getType(), newTypeData, sanitize);

  public appendTypeData(newTypeData?: COMBINED_TYPE_DATA, sanitize = true) {
    return this.appendType(this.getType(), newTypeData, sanitize);
  }

  // should be implemented by derived wrappers
  protected sanitize(type: TYPE, typeData: COMBINED_TYPE_DATA): any {
    return _.cloneDeep(typeData);
  }
}
