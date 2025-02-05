-- QUERIES

--ALL PATIENTS TABLE
CREATE TABLE details (
    id serial,
    name text not NULL,
    reg text PRIMARY KEY,
    age text NULL,
    sex text NULL,
    contact VARCHAR(15) CHECK (LENGTH(contact) BETWEEN 10 AND 15),
    beneficiary text NULL,
    dtype text NULL,
    ddur text NULL,
    insulin text NULL,
    oha text NULL,
    HBA1c text NULL,
    treatment text[] NULL,
    bcvar text NULL,
    bcval text NULL,
    iopr text NULL,
    iopl text NULL,
    drr text NULL,
    drl text NULL,
    mer text NULL,
    mel text NULL,
    octr text NULL,
    octl text NULL,
    advice text[] NULL,
    fllwp text NULL
);

-- PATIENTS LOG TABLE
CREATE TABLE PatientLog (
    log_id serial PRIMARY KEY,
    visit int null,
    reg text NOT NULL,
    dtype text NULL,
    ddur text NULL,
    insulin text NULL,
    oha text NULL,
    HBA1c text NULL,
    treatment text[] NULL,
    bcvar text NULL,
    bcval text NULL,
    iopr text NULL,
    iopl text NULL,
    drr text NULL,
    drl text NULL,
    mer text NULL,
    mel text NULL,
    octr text NULL,
    octl text NULL,
    advice text[] NULL,
    fllwp text NULL,
    notes TEXT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (reg) REFERENCES details(reg) ON DELETE CASCADE
);

-- USERS
CREATE TABLE users(
    id serial PRIMARY KEY,
    email VARCHAR(100) NOT NULL UNIQUE,
    password VARCHAR(100)
);


-- IMAGES
CREATE TABLE images (
    id serial NOT NULL,
    reg text not null,
    filename character varying(255),
    data bytea,
    contenttype character varying(255),
    FOREIGN KEY (reg) REFERENCES details(reg) ON DELETE CASCADE
);




