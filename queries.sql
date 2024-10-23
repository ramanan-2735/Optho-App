-- QUERIES

--DETAILS TABLE
CREATE TABLE details (
    id serial PRIMARY KEY,
    name text,
    reg text,
    age text NULL,
    sex text NULL,
    contact VARCHAR(15) CHECK (LENGTH(contact) BETWEEN 10 AND 15),
    beneficiary text NULL,
    dtype text NULL,
    ddur text NULL,
    insulin text NULL,
    oha text NULL,
    HBA1c text NULL,
    treatment text NULL,
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
    advice text NULL,
    fllwp text NULL
);




