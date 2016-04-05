Accessing the Database
======================

Create a postgres role named pheweb_writer and store its password in postgres_password.

Create a postgres role named pheweb_reader and store its password in postgres_password_readonly.

Create a file `.pgpass` in your home directory containing:

    *:*:*:pheweb_writer:<the_writer_password>
    *:*:*:pheweb_reader:<the_reader_password>

Now run `psql -U pheweb_writer -d postgres -h localhost` to inspect the data.
