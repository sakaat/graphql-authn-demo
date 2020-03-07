import express = require("express");
const router = express.Router();

const { getPostgresClient } = require("../postgres");

router.get("/", async (_req, res) => {
    const sql = "SELECT message FROM tests LIMIT 1";
    const db = await getPostgresClient();
    try {
        const result = await db.execute(sql);
        console.log(result[0].message);
    } finally {
        await db.release();
    }
    res.render("./index");
});

export = router;
