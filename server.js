const express = require("express");
const mysql = require("mysql2");
const path = require("path");
const cors = require("cors");
const faker = require("faker"); // Import faker for generating fake data

const app = express();
const PORT = 3000;

// Enable CORS (so frontend can access API)
app.use(cors());

// Serve static frontend files from 'public' folder
app.use(express.static(path.join(__dirname, "public")));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// MySQL Database Connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root", // Change to your MySQL username
  password: "password", // Change to your MySQL password
  multipleStatements: true,
});

// Create Database
db.query("CREATE DATABASE IF NOT EXISTS FootballDB", (err) => {
  if (err) {
    console.error("Database creation failed:", err);
    return;
  }
  console.log("Database created or already exists.");

  // Connect to the created database
  db.changeUser({ database: "FootballDB" }, (err) => {
    if (err) {
      console.error("Failed to switch to FootballDB:", err);
      return;
    }

    // SQL script to create tables
    const sqlScript = `
        CREATE TABLE IF NOT EXISTS TEAM (
            TeamID INT AUTO_INCREMENT PRIMARY KEY,
            TeamName VARCHAR(255) NOT NULL,
            City VARCHAR(255),
            Stadium VARCHAR(255)
        );

        CREATE TABLE IF NOT EXISTS PLAYER (
            PlayerID INT AUTO_INCREMENT PRIMARY KEY,
            FirstName VARCHAR(255) NOT NULL,
            LastName VARCHAR(255) NOT NULL,
            Position VARCHAR(100),
            DateOfBirth DATE,
            Nationality VARCHAR(100),
            TeamID INT,
            FOREIGN KEY (TeamID) REFERENCES TEAM(TeamID) ON DELETE SET NULL
        );

        CREATE TABLE IF NOT EXISTS MATCHES (
            MatchID INT AUTO_INCREMENT PRIMARY KEY,
            Date DATE NOT NULL,
            HomeTeamID INT,
            AwayTeamID INT,
            Stadium VARCHAR(255),
            Score VARCHAR(50),
            FOREIGN KEY (HomeTeamID) REFERENCES TEAM(TeamID) ON DELETE CASCADE,
            FOREIGN KEY (AwayTeamID) REFERENCES TEAM(TeamID) ON DELETE CASCADE
        );

        CREATE TABLE IF NOT EXISTS PLAYERSTATISTICS (
            PlayerID INT,
            MatchID INT,
            Goals INT DEFAULT 0,
            Assists INT DEFAULT 0,
            YellowCards INT DEFAULT 0,
            RedCards INT DEFAULT 0,
            MinutesPlayed INT DEFAULT 0,
            PRIMARY KEY (PlayerID, MatchID),
            FOREIGN KEY (PlayerID) REFERENCES PLAYER(PlayerID) ON DELETE CASCADE,
            FOREIGN KEY (MatchID) REFERENCES MATCHES(MatchID) ON DELETE CASCADE
        );
    `;

    // Execute the SQL script
    db.query(sqlScript, (err) => {
      if (err) {
        console.error("Table creation failed:", err);
        return;
      }
      console.log("Tables created successfully.");
    });
  });
});

// Generate Fake Data and Insert into Tables
app.get("/generate-fake-data", (req, res) => {
  // Generate Fake Teams
  for (let i = 0; i < 5; i++) {  // Change number for more teams
    const teamName = faker.company.companyName();
    const city = faker.address.city();
    const stadium = faker.company.bsAdjective() + " Stadium";

    db.query("INSERT INTO TEAM (TeamName, City, Stadium) VALUES (?, ?, ?)", [teamName, city, stadium], (err) => {
      if (err) {
        console.error("Error inserting team:", err);
        return;
      }
      console.log(`Inserted team: ${teamName}`);
    });
  }

  // Generate Fake Players
  db.query("SELECT TeamID FROM TEAM", (err, teams) => {
    if (err) {
      console.error("Error fetching teams:", err);
      return;
    }
    
    teams.forEach(team => {
      for (let i = 0; i < 10; i++) {  // Change number for more players per team
        const firstName = faker.name.firstName();
        const lastName = faker.name.lastName();
        const position = faker.random.arrayElement(['Forward', 'Midfielder', 'Defender', 'Goalkeeper']);
        const dateOfBirth = faker.date.past(30);
        const nationality = faker.address.country();

        db.query("INSERT INTO PLAYER (FirstName, LastName, Position, DateOfBirth, Nationality, TeamID) VALUES (?, ?, ?, ?, ?, ?)", 
          [firstName, lastName, position, dateOfBirth, nationality, team.TeamID], (err) => {
          if (err) {
            console.error("Error inserting player:", err);
            return;
          }
          console.log(`Inserted player: ${firstName} ${lastName}`);
        });
      }
    });
  });

  // Generate Fake Matches
  db.query("SELECT TeamID FROM TEAM", (err, teams) => {
    if (err) {
      console.error("Error fetching teams:", err);
      return;
    }

    for (let i = 0; i < 5; i++) {  // Change number for more matches
      const homeTeam = faker.random.arrayElement(teams);
      const awayTeam = faker.random.arrayElement(teams);
      const date = faker.date.future();
      const stadium = faker.company.bsNoun() + " Stadium";
      const score = `${faker.random.number({ min: 0, max: 5 })}-${faker.random.number({ min: 0, max: 5 })}`;

      db.query("INSERT INTO MATCHES (Date, HomeTeamID, AwayTeamID, Stadium, Score) VALUES (?, ?, ?, ?, ?)", 
        [date, homeTeam.TeamID, awayTeam.TeamID, stadium, score], (err) => {
        if (err) {
          console.error("Error inserting match:", err);
          return;
        }
        console.log(`Inserted match between TeamID ${homeTeam.TeamID} and TeamID ${awayTeam.TeamID}`);
      });
    }
  });

  // Generate Fake Player Statistics
  db.query("SELECT PlayerID FROM PLAYER", (err, players) => {
    if (err) {
      console.error("Error fetching players:", err);
      return;
    }
    
    db.query("SELECT MatchID FROM MATCHES", (err, matches) => {
      if (err) {
        console.error("Error fetching matches:", err);
        return;
      }

      players.forEach(player => {
        matches.forEach(match => {
          const goals = faker.random.number({ min: 0, max: 3 });
          const assists = faker.random.number({ min: 0, max: 3 });
          const yellowCards = faker.random.number({ min: 0, max: 2 });
          const redCards = faker.random.number({ min: 0, max: 1 });
          const minutesPlayed = faker.random.number({ min: 45, max: 90 });

          db.query("INSERT INTO PLAYERSTATISTICS (PlayerID, MatchID, Goals, Assists, YellowCards, RedCards, MinutesPlayed) VALUES (?, ?, ?, ?, ?, ?, ?)", 
            [player.PlayerID, match.MatchID, goals, assists, yellowCards, redCards, minutesPlayed], (err) => {
            if (err) {
              console.error("Error inserting player statistics:", err);
              return;
            }
            console.log(`Inserted stats for PlayerID ${player.PlayerID} in MatchID ${match.MatchID}`);
          });
        });
      });
    });
  });

  res.send("Fake data generated successfully!");
});

// Endpoint to get teams data
app.get('/api/teams', (req, res) => {
    db.query('SELECT * FROM TEAM', (err, results) => {
        if (err) {
            console.error("Error fetching teams:", err);
            res.status(500).send("Error fetching data.");
            return;
        }
        res.json(results);  // Send teams data as JSON
    });
});

// Endpoint to get players data
app.get('/api/players', (req, res) => {
    db.query('SELECT * FROM PLAYER', (err, results) => {
        if (err) {
            console.error("Error fetching players:", err);
            res.status(500).send("Error fetching data.");
            return;
        }
        res.json(results);  // Send players data as JSON
    });
});

// Endpoint to get matches data
app.get('/api/matches', (req, res) => {
    db.query('SELECT * FROM MATCHES', (err, results) => {
        if (err) {
            console.error("Error fetching matches:", err);
            res.status(500).send("Error fetching data.");
            return;
        }
        res.json(results);  // Send matches data as JSON
    });
});

// Endpoint to get player statistics data
app.get('/api/playerstats', (req, res) => {
    db.query('SELECT * FROM PLAYERSTATISTICS', (err, results) => {
        if (err) {
            console.error("Error fetching player statistics:", err);
            res.status(500).send("Error fetching data.");
            return;
        }
        res.json(results);  // Send player statistics data as JSON
    });
});


// Start the server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT} 🚀`);
});
