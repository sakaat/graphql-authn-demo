import {} from "./index";

module.exports = {
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
