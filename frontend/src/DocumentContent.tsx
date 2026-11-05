import type { Block } from "./api";

function columnIndex(label: string) {
  return (
    [...label.toUpperCase()].reduce(
      (value, char) => value * 26 + char.charCodeAt(0) - 64,
      0,
    ) - 1
  );
}
function columnLabel(index: number): string {
  let result = "";
  for (let value = index + 1; value > 0; value = Math.floor((value - 1) / 26))
    result = String.fromCharCode(65 + ((value - 1) % 26)) + result;
  return result;
}

export function DocumentContent({
  blocks,
  highlighted,
}: {
  blocks: Block[];
  highlighted?: string;
}) {
  const sheets = new Map<
    string,
    { block: Block; row: number; column: number }[]
  >();
  for (const block of blocks) {
    const match = block.address.match(/^(.*)!\$?([A-Za-z]+)\$?(\d+)$/);
    if (match) {
      const group = sheets.get(match[1]) || [];
      group.push({
        block,
        row: Number(match[3]),
        column: columnIndex(match[2]),
      });
      sheets.set(match[1], group);
    }
  }
  if (sheets.size && [...sheets.values()].flat().length === blocks.length) {
    return (
      <div className="workbook-preview">
        {[...sheets].map(([name, cells]) => {
          const columns = [...new Set(cells.map((cell) => cell.column))].sort(
            (a, b) => a - b,
          );
          const rows = [...new Set(cells.map((cell) => cell.row))].sort(
            (a, b) => a - b,
          );
          const lookup = new Map(
            cells.map((cell) => [`${cell.row}:${cell.column}`, cell.block]),
          );
          return (
            <section
              key={name}
              className="worksheet"
              data-columns={columns.length}
            >
              <h3>{name}</h3>
              <div className="worksheet-scroll">
                <table aria-label={`${name} · 表格内容`}>
                  <thead>
                    <tr>
                      <th scope="col" aria-label="行号" />
                      {columns.map((column) => (
                        <th scope="col" key={column}>
                          {columnLabel(column)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr key={row}>
                        <th scope="row">{row}</th>
                        {columns.map((column) => {
                          const block = lookup.get(`${row}:${column}`);
                          return (
                            <td
                              key={column}
                              className={
                                block?.address === highlighted
                                  ? "highlighted"
                                  : ""
                              }
                              data-address={block?.address}
                              title={`${name}!${columnLabel(column)}${row}`}
                            >
                              {block?.text || (
                                <span className="empty-cell">—</span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          );
        })}
      </div>
    );
  }
  const wordTables = new Map<
    string,
    { block: Block; row: number; column: number }[]
  >();
  for (const block of blocks) {
    const match = block.address.match(/^table:(\d+)\/row:(\d+)\/cell:(\d+)$/);
    if (match) {
      const cells = wordTables.get(match[1]) || [];
      cells.push({ block, row: Number(match[2]), column: Number(match[3]) });
      wordTables.set(match[1], cells);
    }
  }
  const rendered = new Set<string>();
  return (
    <div className="document-reading">
      {blocks.map((block, index) => {
        const tableId = block.address.match(/^table:(\d+)\//)?.[1];
        if (tableId !== undefined) {
          if (rendered.has(tableId)) return null;
          rendered.add(tableId);
          const cells = wordTables.get(tableId)!;
          const rows = [...new Set(cells.map((cell) => cell.row))].sort(
            (a, b) => a - b,
          );
          const columns = [...new Set(cells.map((cell) => cell.column))].sort(
            (a, b) => a - b,
          );
          const lookup = new Map(
            cells.map((cell) => [`${cell.row}:${cell.column}`, cell.block]),
          );
          return (
            <div className="word-table-scroll" key={`table-${tableId}`}>
              <table aria-label={`文档表格 ${Number(tableId) + 1}`}>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row}>
                      {columns.map((column) => {
                        const cell = lookup.get(`${row}:${column}`);
                        return (
                          <td
                            key={column}
                            data-address={cell?.address}
                            className={
                              cell?.address === highlighted ? "highlighted" : ""
                            }
                          >
                            {cell?.text || (
                              <span className="empty-cell">—</span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        return (
          <div
            key={`${block.address}-${index}`}
            data-address={block.address}
            className={`reading-block ${block.address === highlighted ? "highlighted" : ""}`}
          >
            {block.text || <span className="empty-cell">空白</span>}
          </div>
        );
      })}
    </div>
  );
}
