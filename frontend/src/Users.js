import React from "react";
import { Query } from "react-apollo";
import { ROOT_QUERY } from "./App";

const Users = () => (
    <Query query={ROOT_QUERY}>
        {({ data, loading, refetch }) =>
            loading ? (
                <p>loading users...</p>
            ) : (
                <UserList users={data.allUsers} refetchUsers={refetch} />
            )
        }
    </Query>
);

const UserList = ({ users, refetchUsers }) => (
    <div>
        <button onClick={() => refetchUsers()}>Refetch Users</button>
        <table>
            <thead>
                <tr>
                    <th>名前</th>
                    <th>課名</th>
                </tr>
            </thead>
            <tbody>
                {users.map((user) => (
                    <UserListItem
                        key={user.code}
                        name={user.name}
                        dept={user.belongs.name}
                    />
                ))}
            </tbody>
        </table>
    </div>
);

const UserListItem = ({ name, dept }) => (
    <tr>
        <td>{name}</td>
        <td>{dept}</td>
    </tr>
);

export default Users;
