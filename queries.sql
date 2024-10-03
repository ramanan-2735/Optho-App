-- QUERIES

-- PATIENTS TABLE
create table patients(
    id serial primary key,
    name varchar(45)
);

--DETAILS TABLE
create table details(
    id serial primary key,
    name varchar(45),
    registration_number varchar(20),
    age_sex varchar(10),
    contact_number VARCHAR(15) CHECK (LENGTH(contact_number) BETWEEN 10 AND 15),
    diabetes_type text,
    insulin varchar(5),
    OHA_count int,
    HBA1c DECIMAL(4, 2),
    BCVA_right varchar(10),
    BCVA_left varchar(10),
    IOP_right DECIMAL(4, 1),
    IOP_left DECIMAL(4, 1),
    DR_right smallint,
    macular_edema_right char(1),
    oct_right smallint,
    DR_left smallint,
    macular_edema_left char(1),
    oct_left smallint,
    advice_right text,
    advice_left text,
    follow_up text
);