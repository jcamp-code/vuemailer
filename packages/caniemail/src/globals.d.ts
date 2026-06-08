// The caniemail dataset is imported for its runtime value only (esbuild's json loader inlines it into the
// bundle). We type the import as `unknown` and cast to RawData in index.ts, so neither tsc nor the dts build
// infers a 600 KB+ literal type from the JSON. (This package sets resolveJsonModule:false so this ambient
// declaration wins.)
declare module '*.json' {
  const value: unknown
  export default value
}
