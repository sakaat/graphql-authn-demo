CREATE TABLE users (
  id      varchar(20)
, company varchar(3)
, code    integer
, name    varchar(20)
, email   varchar(40)
, dept    integer
, token   varchar(100)
, CONSTRAINT users_pkey PRIMARY KEY(id)
);

CREATE TABLE depts (
  id      varchar(20)
, code    integer
, name    varchar(20)
, CONSTRAINT depts_pkey PRIMARY KEY(id)
);
