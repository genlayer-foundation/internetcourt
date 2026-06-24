/**
 * Server component that renders a single JSON-LD `<script>` tag.
 *
 * Pass a single schema object or an array of schema objects (the array is
 * stringified as-is, producing one `<script>` containing a JSON array — valid
 * JSON-LD when each object carries its own `@context`).
 *
 * `<` is escaped to `<` to prevent a `</script>` breakout from any
 * user/content-derived string in the data.
 */
function serialize(data: object | object[]): string {
  return JSON.stringify(data).replace(/</g, "\\u003c");
}

export function JsonLd({ data }: { data: object | object[] }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serialize(data) }}
    />
  );
}

export default JsonLd;
