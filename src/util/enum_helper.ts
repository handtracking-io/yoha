/**
 * @public
 * A small helper that is used to build a type consisting of all values of an object literal.<br/>
 *
 * @example
 * ```
 * const MyEnum =  {
 *    ENUM_VALUE_ONE: "value_one", 
 *    ENUM_VALUE_TWO: "value_two",
 * } as const;
 * type PossibleEnumValues = ObjValues<typeof MyEnum>
 * ```
 * Here `PossibleEnumValues` will resolve to the type `'"value_one" | "value_two"'`.
 *
 * @remarks
 *
 * This is used to work around native enums (and some of their limitations) in TypeScript.
 */
export type ObjValues<T> = T[keyof T];
