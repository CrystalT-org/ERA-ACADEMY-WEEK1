const express = require("express");
const db = require(".//db");
const cors = require("cors");
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
// root route -- confirms the server is running
app.get("/", (req,res) => {
    res.send("backend is running with mySQL");
});

// GET / students -- returns all students from mySQL
app.get("/students", (req,res) => {
    const sql = "SELECT * FROM students";
    db.query(sql, (error,results) => {
        if(error) {
            console.error("error getting students:", error);
            return res.status(500).json({error: "failed to get students."});
        }
        res.json(results);
    });
});

//POST /students -- Recieves new student &inserts into mySQL
app.post("/students", (req,res) => {
    const {first_name, last_name, grade_level} = req.body;
    
    // Validation -- reject if any field missing
    if (!first_name || !last_name || !grade_level) {
        return res.status(400).json({error: "first_name, last_name & grade_level are required"});
    }
    const sql = "INSERT INTO students(first_name, last_name, grade_level) VALUES(?, ?, ?)";
    db.query(sql, [first_name, last_name, grade_level],(error,results) => {
        if(error){
        console.error("error adding student:", error);
        return res.status(500).json({error: "failed to add student"});
        }
        res.status(201).json({message: "student added successfully", studentId: results.insertId});
    });
});

// POST /users -- Creates a new user account
app.post("/users", (req,res) => {
    const {first_name, last_name, email, password} = req.body;
    if(!first_name || !last_name || !email || !password) {
        return res.status(400).json({error: "first_name, last_name, email & password are required"});
    }
    if(password.length < 8) {
        return res.status(400).json({error: "password must be atleast 8 characters long"});
    }
    const specialChar = /[!@#$%]/;
    if(!specialChar.test(password)) {
        return res.status(400).json({error: "password must include atleast 1 special character: ! @ # $ %"});
    }
    // Auto link to students table by matching first and last name
    const findStudent = "SELECT id FROM students WHERE first_name = ? AND last_name = ?";
    db.query(findStudent, [first_name, last_name],(err,students) => {
        if(err) return res.status(500).json({error:"failed to create user"});
        
        const student_id = students.length > 0 ? students[0].id : null;
        const sql = "INSERT INTO users(first_name, last_name, email, password, student_id) VALUES (?, ?, ?, ?, ?)";
        db.query(sql, [first_name, last_name, email, password, student_id], (error, results) => {
            if(error) {
                console.error("error creating user:", error);
                return res.status(500).json({error: "failed to create user"});
            }
            res.status(201).json({
                message: "user created successfully",
                userId: "result.insertId",
                student_id: student_id
            });
        });
    });
});

// GET /users
app.get("/users", (req,res) => {
    const sql = "SELECT id, first_name, last_name, email FROM users";
    db.query(sql,(error, results) => {
        if(error) return res.status(500).json({error: "failed to get users"});
        res.json(results);
    });
});

// POST /login -- checks email and password against users table
app.post("/login", (req,res) => {
    const {email, password} = req.body;
    if(!email || !password) {
        return res.status(400).json({error: "email & password are required"});
    }
    if(password.length < 8) {
        return res.status(400).json({error: "password must be atleast 8 characters long"});
    }
    const specialChar = /[!@#$%]/;
    if(!specialChar.test(password)) {
        return res.status(400).json({error: "password must include atleast 1 special character: ! @ # $ %"});
    }
    const sql = "SELECT * FROM users WHERE email = ?";
    db.query(sql, [email],(error, results) => {
        if(error) {
            console.error("login query error:", error);
            return res.status(500).json({error: "something went wrong"});
        }
        if(results.length === 0) {
            return res.status(401).json({error: "invalid email or password"});
        }
        const user = results[0];
        if(user.password !== password) {
            return res.status(401).json({error: "invalid email or password"});
        }
        // Step 5: login successful -- Return name so frontend can update the navbar
        res.status(200).json({
            message: "login successful",
            first_name: user.first_name,
            last_name: user.last_name,
            student_id: user.student_id
        });
    });
});

// GET /students/:id/assignments
app.get("/students/:id/assignments", (req,res) => {
    const {id} = req.params;
    const sql = "SELECT assignments.assignment_name, assignments.due_date, assignments.max_points, student_assignments.score, student_assignments.submitted_date, classes.class_name FROM assignments JOIN classes ON assignments.class_id = classes.id LEFT JOIN student_assignments ON student_assignments.assignment_id = assignments.id AND student_assignments.student_id = ? WHERE assignments.class_id IN (SELECT class_id FROM enrollments WHERE student_id = ?)";
    db.query(sql, [id, id], (error,results) => {
        if(error) {
            console.error("error getting assignments:", error);
            return res.status(500).json({error: "failed to get assignments"});
        }
        res.json(results);
    });
});

// GET / classes -- returns all classes from mySQL
app.get("/classes", (req,res) => {
    const sql = "SELECT * FROM classes";
    db.query(sql, (error,results) => {
        if(error) {
            console.error("error getting classes:", error);
            return res.status(500).json({error: "failed to get classes."});
        }
        res.json(results);
    });
});

// GET / enrollments -- returns joined data (student name + class name)
app.get("/enrollments", (req,res) => {
    const sql = "SELECT students.first_name, students.last_name, classes.class_name, classes.teacher_name FROM enrollments JOIN students ON enrollments.student_id = students.id JOIN classes ON enrollments.class_id = classes.id";
    db.query(sql, (error,results) => {
        if(error) {
            console.error("error getting enrollments:", error);
            return res.status(500).json({error:"failed to get enrollments."});
        }
        res.json(results);
    });
});

// GET /students/:id -- Returns 1 student by id
app.get("/students/:id", (req,res) => {
    const {id} = req.params;
    const sql = "SELECT * FROM students WHERE id = ?";
    db.query(sql,[id], (error,results) => {
        if(error) {
            console.error("error getting student:", error);
            return res.status(500).json({error:"failed to get student"});
        }
        if(results.length === 0) {
            return res.status(404).json({error:"student not found"});
        }
        res.json(results[0]);
    });
});

// Get /students/:id/grades -- Returns grades for 1 student
app.get("/students/:id/grades", (req,res) => {
    const {id} = req.params;
    const sql = "SELECT classes.class_name, grades.grade_value FROM grades JOIN classes ON grades.class_id = classes.id WHERE grades.student_id = ?";
    db.query(sql, [id], (error,results) => {
        if(error) {
            console.error("error getting grades:", error);
            return res.status(500).json({error:"failed to get grades"});
        }
        res.json(results);
    });
});

// Get /students/:id/attendance -- Returns attendance for 1 students
app.get("/students/:id/attendance", (req,res) => {
    const {id} = req.params;
    const sql = "SELECT classes.class_name, attendance.date, attendance.status FROM attendance JOIN classes ON attendance.class_id = classes.id WHERE attendance.student_id = ? ORDER BY attendance.date DESC";
    db.query(sql, [id], (error,results) => {
        if(error) {
            console.error("error getting attendance:", error);
            return res.status(500).json({error: "failed to get attendance"});
        }
        res.json(results);
    });
});

app.listen(PORT,() => {
    console.log(`server running at http://localhost:${PORT}`);
});