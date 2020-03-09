import React from "react";
import Users from "./Users";
import { gql } from "apollo-boost";

export const ROOT_QUERY = gql`
    query {
        allUsers {
            code
            name
            belongs {
                name
            }
        }
    }
`;

const App = () => <Users />;

export default App;
