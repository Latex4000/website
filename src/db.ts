import { getSecret } from "astro:env/server";
import type { Pool, PoolConnection, PoolOptions } from "mysql2/promise";
import { createPool } from "mysql2/promise";

type Field = Date | boolean | number | string | null;
type Row = Record<string, Field>;
type StatementInsert = `${string}INSERT INTO${string}` | `${string}INSERT IGNORE INTO${string}`;
type StatementSelect = `${string}SELECT${string}FROM${string}`;
type StatementUpdate = `${string}UPDATE${string}`;

class MysqlConnection {
	#connection: PoolConnection;

	constructor(connection: PoolConnection) {
		this.#connection = connection;
	}

	query(sql: StatementInsert, values?: unknown[]): Promise<{ insertId: number }>;
	query<T = Row>(sql: StatementSelect, values?: unknown[]): Promise<T[]>;
	query(sql: StatementUpdate, values?: unknown[]): Promise<{ changedRows: number }>;
	query(sql: string, values?: unknown[]): Promise<void>;
	query(sql: string, values?: unknown[]): Promise<unknown> {
		return this.#connection.query(sql, values).then((result) => result[0]);
	}

	queryOne<T = Row>(sql: StatementSelect, values?: unknown[]): Promise<T | null> {
		return this.query<T>(sql, values).then((result) => result[0] ?? null);
	}

	async transact<T>(fn: (connection: this) => Promise<T>): Promise<T> {
		await this.query("START TRANSACTION");

		try {
			const result = await fn(this);
			await this.query("COMMIT");
			return result;
		} catch (error) {
			await this.query("ROLLBACK");
			throw error;
		}
	}
}

class MysqlPool {
	#closed = false;
	#pool: Pool;

	constructor(config: PoolOptions) {
		this.#pool = createPool(config);
	}

	get pool(): Pool {
		return this.#pool;
	}

	async close(): Promise<void> {
		if (this.#closed) {
			return;
		}

		await this.#pool.end();

		this.#closed = true;
	}

	readonly query: MysqlConnection["query"] = (...args: unknown[]) =>
		this.useConnection((connection: any) => connection.query(...args)) as any;

	readonly queryOne: MysqlConnection["queryOne"] = (...args) =>
		this.useConnection((connection) => connection.queryOne(...args));

	readonly transact: MysqlConnection["transact"] = (...args) =>
		this.useConnection((connection) => connection.transact(...args));

	async useConnection<T>(fn: (connection: MysqlConnection) => Promise<T>): Promise<T> {
		if (this.#closed) {
			throw new Error("Connection pool has been closed");
		}

		const connection = await this.#pool.getConnection();

		try {
			return await fn(new MysqlConnection(connection));
		} finally {
			connection.release();
		}
	}
}

const db = new MysqlPool({
	database: getSecret("MYSQL_DATABASE") ?? "",
	password: getSecret("MYSQL_PASSWORD") ?? "",
	user: getSecret("MYSQL_USER") ?? "",

	charset: "utf8mb4_general_ci",

	typeCast: function (field, next) {
		if (field.type === "TINY" && field.length === 1) {
			const string = field.string();
			return string === "0" ? false : string === "1" ? true : null;
		}

		return next();
	},
});
export default db;
