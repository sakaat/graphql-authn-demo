import Mutation = require("./Mutation");
import Query = require("./Query");
import Type = require("./Type");

export const resolvers = {
    Query,
    Mutation,
    ...Type,
};
