const { getPostgresClient } = require("../postgres");

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
