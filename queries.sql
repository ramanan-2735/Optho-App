-- QUERIES

-- PATIENTS TABLE
create table patients(
    id serial primary key,
    name varchar(45)
);

--DETAILS TABLE
CREATE TABLE details (
    id serial PRIMARY KEY,
    name text,
    registration_number text,
    age_sex text NULL,
    contact_number VARCHAR(15) CHECK (LENGTH(contact_number) BETWEEN 10 AND 15),
    diabetes_type text NULL,
    insulin text NULL,
    OHA_count text,
    HBA1c text,
    BCVA_right text NULL,
    BCVA_left text,
    IOP_right text,
    IOP_left text,
    DR_right text,
    macular_edema_right text NULL,
    oct_right text,
    DR_left text,
    macular_edema_left text NULL,
    oct_left text,
    advice_right text NULL,
    advice_left text NULL,
    follow_up text NULL
);




-- CREATE TABLE details (
--     id serial PRIMARY KEY,
--     name varchar(45) ,
--     registration_number varchar(20) ,
--     age_sex varchar(10) NULL,
--     contact_number VARCHAR(15) CHECK (LENGTH(contact_number) BETWEEN 10 AND 15) ,
--     diabetes_type text NULL,
--     insulin varchar(5) NULL,
--     OHA_count int ,
--     HBA1c DECIMAL(4, 2) ,
--     BCVA_right varchar(10) NULL,
--     BCVA_left varchar(10) ,
--     IOP_right DECIMAL(4, 1) ,
--     IOP_left DECIMAL(4, 1) ,
--     DR_right smallint ,
--     macular_edema_right char(1) NULL,
--     oct_right smallint ,
--     DR_left smallint ,
--     macular_edema_left char(1) NULL,
--     oct_left smallint ,
--     advice_right text NULL,
--     advice_left text NULL,
--     follow_up text NULL
-- );