-- QUERIES

-- PATIENTS TABLE
create table patients(
    id serial primary key,
    name varchar(45)
);

--DETAILS TABLE
CREATE TABLE details (
    id serial PRIMARY KEY,
    name varchar(45) ,
    registration_number varchar(20) ,
    age_sex varchar(10) NULL,
    contact_number VARCHAR(15) CHECK (LENGTH(contact_number) BETWEEN 10 AND 15) ,
    diabetes_type text NULL,
    insulin varchar(5) NULL,
    OHA_count int NULL,
    HBA1c DECIMAL(4, 2) NULL,
    BCVA_right varchar(10) NULL,
    BCVA_left varchar(10) NULL,
    IOP_right DECIMAL(4, 1) NULL,
    IOP_left DECIMAL(4, 1) NULL,
    DR_right smallint NULL,
    macular_edema_right char(1) NULL,
    oct_right smallint NULL,
    DR_left smallint NULL,
    macular_edema_left char(1) NULL,
    oct_left smallint NULL,
    advice_right text NULL,
    advice_left text NULL,
    follow_up text NULL
);
