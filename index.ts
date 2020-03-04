import { ExpressOIDC } from "@okta/oidc-middleware";
import apollo = require("apollo-server-express");
import bcrypt = require("bcryptjs");
import cors = require("cors");
import express = require("express");
import session = require("express-session");
import fs = require("fs");
import depthLimit = require("graphql-depth-limit");
import expressPlayground from "graphql-playground-middleware-express";
import { createComplexityLimitRule } from "graphql-validation-complexity";
import { createServer } from "http";
import { v4 as uuidv4 } from "uuid";

require("dotenv").config();
if (typeof process.env.OKTA_DOMAIN == "undefined") {
    console.error('Error: "OKTA_DOMAIN" is not set.');
    console.error("Please consider adding a .env file with OKTA_DOMAIN.");
    process.exit(1);
}

const salt = bcrypt.genSaltSync(10);

const typeDefs = fs.readFileSync("./typeDefs.graphql", "UTF-8");

const users = [];
const depts = [{ id: "2CiwYjCbSm2WZHkrUGN9", code: 3002, name: "二課" }];

const resolvers = {
    Query: {
        allUsers: (_parent, args, { currentUser }) => {
            if (!currentUser) {
                throw new Error("Only an authorized user can search users.");
            }
            if (args.code) {
                return users.filter((u) => u.code === args.code);
            } else {
                return users;
            }
        },
        allDepts: (_parent, args) => {
            if (args.code) {
                return depts.filter((d) => d.code === args.code);
            } else {
                return depts;
            }
        },
    },
    User: {
        belongs: (parent) => {
            return depts.find((d) => d.code === parent.dept);
        },
    },
    Dept: {
        members: (parent) => {
            return users.filter((u) => u.dept === parent.code);
        },
    },
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
        const currentUser = users.find((u) =>
            bcrypt.compareSync(accessToken, u.token),
        );
        return { currentUser };
    },
});
server.applyMiddleware({ app });

app.get("/", (_req, res) => {
    res.render("./index");
});

app.get("/signin", oidc.ensureAuthenticated(), (req: any, res) => {
    const userinfo = req.userContext.userinfo;
    let dummyCode = "";
    for (let i = 0; i < 6; i++) {
        // tslint:disable-next-line: insecure-random
        dummyCode += (Math.floor(Math.random() * 9) + 1).toString();
    }
    const dummyToken = uuidv4().replace(/-/g, "");
    const hashedToken = bcrypt.hashSync(dummyToken, salt);
    let exists = false;
    for (const [index, user] of users.entries()) {
        if (user.id === userinfo.sub) {
            exists = true;
            users[index].token = hashedToken;
        }
    }
    if (!exists) {
        users.push({
            id: userinfo.sub,
            company: "AAA",
            code: Number(dummyCode),
            name: userinfo.name,
            email: userinfo.preferred_username,
            dept: 3002,
            token: hashedToken,
        });
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
