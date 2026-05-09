import { cn } from "@/utils/cn.js";
import { formatTableCell } from "@/utils/format.js";

export function DataTable({
  rows,
  className,
  emptyMessage = "No rows",
  maxHeightClass = "max-h-[min(70vh,560px)]",
}) {
  if (!rows?.length) {
    return (
      <p className="ui-table-empty">
        {emptyMessage}
      </p>
    );
  }

  const keys = Object.keys(rows[0]);

  return (
    <div
      className={cn(
        "ui-table-wrap",
        maxHeightClass,
        className
      )}
    >
      <table className="w-full min-w-max border-collapse text-left text-sm">
        <thead className="ui-table-head">
          <tr className="ui-table-head-row">
            {keys.map((k) => (
              <th
                key={k}
                className="ui-table-head-cell"
              >
                {k.replace(/_/g, " ")}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="ui-table-body">
          {rows.map((row, i) => (
            <tr key={i} className="ui-table-row">
              {keys.map((k) => (
                <td
                  key={k}
                  className="ui-table-cell"
                  title={formatTableCell(row[k])}
                >
                  {formatTableCell(row[k])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
