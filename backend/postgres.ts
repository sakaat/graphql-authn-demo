import pg = require("pg");
const pool = new pg.Pool({
    database: process.env.POSTGRES_DB,
    user: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    host: process.env.POSTGRES_HOST,
    port: parseInt(process.env.POSTGRES_PORT, 10),
});

class Postgres {
    private client: pg.PoolClient;

    async init() {
        this.client = await pool.connect();
    }

    async execute(query, params = []) {
        return (await this.client.query(query, params)).rows;
    }

    async release() {
        await this.client.release(true);
    }

    async begin() {
        await this.client.query("BEGIN");
    }

    async commit() {
        await this.client.query("COMMIT");
    }

    async rollback() {
        await this.client.query("ROLLBACK");
    }
}

const getClient = async () => {
    const postgres = new Postgres();
    await postgres.init();
    return postgres;
};

module.exports.getPostgresClient = getClient;
