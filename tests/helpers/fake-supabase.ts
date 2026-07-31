/**
 * A small in-memory stand-in for the Supabase client.
 *
 * Only the query shapes the voice routes actually use are implemented. This is
 * deliberately not a general Postgres emulator — it exists so the real route
 * handlers can be driven end to end without a database, and anything it does
 * not support should fail loudly rather than quietly returning nothing.
 */

export type Row = Record<string, unknown>;
export type Tables = Record<string, Row[]>;

type Filter = { column: string; value: unknown; op: "eq" | "gte" | "is" };

function matches(row: Row, filters: Filter[]): boolean {
  return filters.every((filter) => {
    const actual = row[filter.column];
    if (filter.op === "eq") return actual === filter.value;
    // `is` is used for null checks, which is what makes the atomic
    // notification claim in the status webhook testable.
    if (filter.op === "is") {
      return filter.value === null
        ? actual === null || actual === undefined
        : actual === filter.value;
    }
    return String(actual) >= String(filter.value);
  });
}

let idCounter = 0;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

export function resetIds() {
  idCounter = 0;
}

class Query implements PromiseLike<{ data: unknown; error: null; count?: number }> {
  private filters: Filter[] = [];
  private wantCount = false;
  private headOnly = false;
  private orderColumn: string | null = null;
  private pending: { kind: "select" | "insert" | "update" | "delete"; payload?: Row | Row[] } = {
    kind: "select",
  };
  private inserted: Row[] = [];

  constructor(
    private tables: Tables,
    private table: string,
  ) {}

  private get rows(): Row[] {
    this.tables[this.table] ??= [];
    return this.tables[this.table];
  }

  select(_columns?: string, options?: { count?: string; head?: boolean }) {
    if (options?.count) this.wantCount = true;
    if (options?.head) this.headOnly = true;
    return this;
  }

  insert(payload: Row | Row[]) {
    this.pending = { kind: "insert", payload };
    return this;
  }

  update(payload: Row) {
    this.pending = { kind: "update", payload };
    return this;
  }

  delete() {
    this.pending = { kind: "delete" };
    return this;
  }

  eq(column: string, value: unknown) {
    this.filters.push({ column, value, op: "eq" });
    return this;
  }

  gte(column: string, value: unknown) {
    this.filters.push({ column, value, op: "gte" });
    return this;
  }

  is(column: string, value: unknown) {
    this.filters.push({ column, value, op: "is" });
    return this;
  }

  order(column: string) {
    this.orderColumn = column;
    return this;
  }

  limit(_count: number) {
    return this;
  }

  private run() {
    switch (this.pending.kind) {
      case "insert": {
        const payload = this.pending.payload as Row | Row[];
        const items = Array.isArray(payload) ? payload : [payload];
        this.inserted = items.map((item) => ({
          id: item.id ?? nextId(this.table),
          created_at: new Date().toISOString(),
          ...item,
        }));
        this.rows.push(...this.inserted);
        return this.inserted;
      }

      case "update": {
        const updated: Row[] = [];
        for (const row of this.rows) {
          if (!matches(row, this.filters)) continue;
          Object.assign(row, this.pending.payload);
          updated.push(row);
        }
        return updated;
      }

      case "delete": {
        const keep = this.rows.filter((row) => !matches(row, this.filters));
        const removed = this.rows.length - keep.length;
        this.tables[this.table] = keep;
        return new Array(removed).fill({});
      }

      default: {
        let found = this.rows.filter((row) => matches(row, this.filters));
        if (this.orderColumn) {
          const column = this.orderColumn;
          found = [...found].sort((a, b) =>
            String(a[column]).localeCompare(String(b[column])),
          );
        }
        return found;
      }
    }
  }

  async maybeSingle() {
    const result = this.run();
    return { data: result[0] ?? null, error: null };
  }

  async single() {
    return this.maybeSingle();
  }

  then<TResult1 = { data: unknown; error: null; count?: number }, TResult2 = never>(
    onfulfilled?:
      | ((value: { data: unknown; error: null; count?: number }) => TResult1 | PromiseLike<TResult1>)
      | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    const result = this.run();
    const value = {
      data: this.headOnly ? null : result,
      error: null as null,
      ...(this.wantCount ? { count: result.length } : {}),
    };
    return Promise.resolve(value).then(onfulfilled, onrejected);
  }
}

export function createFakeSupabase(tables: Tables) {
  return {
    from(table: string) {
      return new Query(tables, table);
    },
  };
}
