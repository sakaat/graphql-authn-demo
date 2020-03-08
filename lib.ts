import * as R from "ramda";
import { v4 as uuidv4 } from "uuid";

const { getPostgresClient } = require("./postgres");

export const generateDummyCode = (): number => {
    let code = "";
    for (let i = 0; i < 6; i++) {
        code += (Math.floor(Math.random() * 9) + 1).toString();
    }
    return Number(code);
};

export const generateDummyToken = (): string => {
    return uuidv4().replace(/-/g, "");
};

export const listsUsers = async (code) => {
    const db = await getPostgresClient();
    const sql = "SELECT * FROM users WHERE dept = any($1)";
    const params = [code];
    try {
        const result = await db.execute(sql, params);
        const groupedById = R.groupBy((list: any) => list.dept, result);
        return R.map((id) => groupedById[id] || [], code);
    } finally {
        await db.release();
    }
};

export const listsDepts = async (dept) => {
    const db = await getPostgresClient();
    const sql = "SELECT * FROM depts WHERE code = any($1)";
    const params = [dept];
    try {
        const result = await db.execute(sql, params);
        const groupedById = R.groupBy((list: any) => list.code, result);
        const sortedByDept = R.map((id) => groupedById[id] || [], dept);
        return sortedByDept.flat();
    } finally {
        await db.release();
    }
};
