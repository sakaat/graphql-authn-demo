import { ExpressOIDC } from "@okta/oidc-middleware";
import apollo = require("apollo-server-express");
import cors = require("cors");
import DataLoader from "dataloader";
import express = require("express");
import session = require("express-session");
import fs = require("fs");
import depthLimit = require("graphql-depth-limit");
import expressPlayground from "graphql-playground-middleware-express";
import { createComplexityLimitRule } from "graphql-validation-complexity";
import { createServer } from "http";
import * as R from "ramda";
import { v4 as uuidv4 } from "uuid";

import router = require("./router");

const { getPostgresClient } = require("./postgres");

if (process.env.OKTA_DOMAIN === undefined) {
    console.error('Error: "OKTA_DOMAIN" is not set.');
    console.error("Please consider adding a .env file with OKTA_DOMAIN.");
    process.exit(1);
}

const typeDefs = fs.readFileSync("./typeDefs.graphql", "UTF-8");
import { resolvers } from "./resolvers";

const listsUsers = async (code) => {
    console.log(code);
    const db = await getPostgresClient();
    const sql = "SELECT * FROM users WHERE dept = any($1)";
    const params = [code];
    try {
        const result = await db.execute(sql, params);
        const groupedById = R.groupBy((list) => list.dept, result);
        return R.map((id) => groupedById[id] || [], code);
    } finally {
        await db.release();
    }
};

const listsDepts = async (dept) => {
    console.log(dept);
    const db = await getPostgresClient();
    const sql = "SELECT * FROM depts WHERE code = any($1)";
    const params = [dept];
    try {
        const result = await db.execute(sql, params);
        const groupedById = R.groupBy((list) => list.code, result);
        const sortedByDept = R.map((id) => groupedById[id] || [], dept);
        return sortedByDept.flat();
    } finally {
        await db.release();
    }
};

const app = express();
app.use(cors());
app.set("view engine", "ejs");

app.use(
    session({
        secret: process.env.SESSION_SECRET,
        resave: true,
        saveUninitialized: false,
    }),
);

const oidc = new ExpressOIDC({
    issuer: `https://${process.env.OKTA_DOMAIN}`,
    client_id: process.env.CLIENT_ID,
    client_secret: process.env.CLIENT_SECRET,
    appBaseUrl: process.env.APP_URL,
    redirect_uri: `${process.env.APP_URL}/authorization-code/callback`,
    routes: {
        callback: { defaultRedirect: "/" },
    },
    scope: "openid profile",
});
app.use(oidc.router);

const server = new apollo.ApolloServer({
    typeDefs,
    resolvers,
    playground: true,
    introspection: true,
    validationRules: [
        depthLimit(5),
        createComplexityLimitRule(1000, {
            onCost: (cost) => console.log("query cost:", cost),
        }),
    ],
    context: async ({ req, connection }) => {
        const accessToken = req
            ? req.headers.authorization
            : connection.context.authorization;

        const sql = "SELECT name FROM users WHERE token = $1";
        const params = [accessToken];
        const db = await getPostgresClient();
        let currentUser;
        try {
            currentUser = await db.execute(sql, params);
        } finally {
            await db.release();
        }
        console.log(currentUser);

        return {
            currentUser,
            listLoaderUsers: new DataLoader(listsUsers),
            listLoaderDepts: new DataLoader(listsDepts),
        };
    },
});
server.applyMiddleware({ app });

app.use("/", router);

app.get("/signin", oidc.ensureAuthenticated(), async (req: any, res) => {
    const userinfo = req.userContext.userinfo;
    let dummyCode = "";
    for (let i = 0; i < 6; i++) {
        // tslint:disable-next-line: insecure-random
        dummyCode += (Math.floor(Math.random() * 9) + 1).toString();
    }
    const dummyToken = uuidv4().replace(/-/g, "");

    let result;
    {
        const sql = "SELECT name FROM users WHERE id = $1";
        const params = [userinfo.sub];
        const db = await getPostgresClient();
        try {
            result = await db.execute(sql, params);
        } finally {
            await db.release();
        }
    }

    if (!result[0]) {
        const sql = "INSERT INTO users VALUES ($1, $2, $3, $4, $5, $6, $7)";
        const params = [
            userinfo.sub,
            "AAA",
            Number(dummyCode),
            userinfo.name,
            userinfo.preferred_username,
            5678,
            dummyToken,
        ];
        const db = await getPostgresClient();
        try {
            await db.begin();
            await db.execute(sql, params);
            await db.commit();
            console.log("Successfully inserted.");
        } catch (e) {
            await db.rollback();
            throw e;
        } finally {
            await db.release();
        }
    } else {
        const sql = "UPDATE users SET token = $1 WHERE id = $2";
        const params = [dummyToken, userinfo.sub];
        const db = await getPostgresClient();
        try {
            await db.begin();
            await db.execute(sql, params);
            await db.commit();
            console.log("Successfully updated.");
        } catch (e) {
            await db.rollback();
            throw e;
        } finally {
            await db.release();
        }
    }
    res.render("./signin", { token: dummyToken });
});

app.get("/playground", expressPlayground({ endpoint: "/graphql" }));

const httpServer = createServer(app);
httpServer.timeout = 5000;

const port = process.env.PORT || 4000;
oidc.on("ready", () => {
    httpServer.listen({ port }, () => {
        console.log(
            `GraphQL Server running at localhost:${port}${server.graphqlPath}`,
        );
    });
});
oidc.on("error", (err) => {
    console.error(err);
});
