import fetch from "node-fetch";
import { generateDummyCode, generateDummyToken } from "../lib";

const { getPostgresClient } = require("../postgres");

module.exports = {
    async addFakeUsers(_root, { count }) {
        const randomUserApi = `https://randomuser.me/api/?results=${count}`;

        const { results } = await fetch(randomUserApi).then((res) =>
            res.json(),
        );

        const users = results.map((r) => ({
            id: r.login.sha1.slice(0, 20),
            company: "AAA",
            code: generateDummyCode(),
            name: `${r.name.first} ${r.name.last}`,
            email: r.email,
            dept: 1234,
            token: generateDummyToken(),
        }));

        const db = await getPostgresClient();
        const sql = "INSERT INTO users VALUES ($1, $2, $3, $4, $5, $6, $7)";
        try {
            await db.begin();
            users.map(async (u) => {
                const params = [
                    u.id,
                    u.company,
                    u.code,
                    u.name,
                    u.email,
                    u.dept,
                    u.token,
                ];
                await db.execute(sql, params);
            });
            await db.commit();
            console.log("Successfully inserted.");
            return users;
        } catch (e) {
            await db.rollback();
            throw e;
        } finally {
            await db.release();
        }
    },
};
