import * as R from "ramda";

const { getPostgresClient } = require("../postgres");

export const listsUsers = async (code) => {
    console.log(code);
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
    console.log(dept);
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

export const resolvers = {
    Query: {
        allUsers: async (_parent, args, { currentUser }) => {
            if (!currentUser[0]) {
                throw new Error("Only an authorized user can search users.");
            }
            const db = await getPostgresClient();
            let sql = "SELECT * FROM users";
            let params;
            if (args.code) {
                sql += " WHERE code = $1";
                params = [args.code];
            } else {
                params = [];
            }
            try {
                return await db.execute(sql, params);
            } finally {
                await db.release();
            }
        },
        allDepts: async (_parent, args) => {
            const db = await getPostgresClient();
            let sql = "SELECT * FROM depts";
            let params;
            if (args.code) {
                sql += " WHERE code = $1";
                params = [args.code];
            } else {
                params = [];
            }
            try {
                return await db.execute(sql, params);
            } finally {
                await db.release();
            }
        },
    },
    User: {
        belongs: (parent, _args, context) => {
            return context.listLoaderDepts.load(parent.dept);
        },
    },
    Dept: {
        members: (parent, _args, context) => {
            return context.listLoaderUsers.load(parent.code);
        },
    },
};
