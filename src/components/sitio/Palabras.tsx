/** Texto partido en palabras (inline-block) para animarlas una por una; el espacio queda como texto entre ellas. */
export function Palabras({ children }: { children: string }) {
  return children.split(" ").map((palabra, i, todas) => (
    <span key={`${palabra}-${i}`}>
      <span data-palabra className="inline-block">
        {palabra}
      </span>
      {i < todas.length - 1 ? " " : null}
    </span>
  ));
}
