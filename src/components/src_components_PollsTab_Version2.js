import React, { useState, useEffect } from "react";

const PollsTab = () => {
  const [dailyPoll, setDailyPoll] = useState({
    question: "What's your favorite subject?",
    options: ["Math", "Science", "English", "History"],
    votes: {},
  });
  const [userPolls, setUserPolls] = useState([]);
  const [newPollQuestion, setNewPollQuestion] = useState("");
  const [newPollOptions, setNewPollOptions] = useState(["", ""]);

  // Hardcoded Google Form link
  const hardcodedGoogleFormLink = "https://docs.google.com/forms/d/e/1FAIpQLSeEXAMPLE/viewform"; // Replace with actual link

  // State for user-submitted Google Forms
  const [userGoogleForms, setUserGoogleForms] = useState([]);
  const [newGoogleFormLink, setNewGoogleFormLink] = useState("");

  useEffect(() => {
    // Load daily poll votes from localStorage
    const savedDailyVotes = localStorage.getItem("dailyPollVotes");
    if (savedDailyVotes) {
      setDailyPoll((prev) => ({ ...prev, votes: JSON.parse(savedDailyVotes) }));
    }

    // Load user polls from localStorage, filter to last 7 days
    const savedUserPolls = localStorage.getItem("userPolls");
    if (savedUserPolls) {
      const polls = JSON.parse(savedUserPolls);
      const now = new Date().getTime();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      const recentPolls = polls.filter((poll) => poll.timestamp > sevenDaysAgo);
      setUserPolls(recentPolls);
      // Update localStorage with filtered polls
      localStorage.setItem("userPolls", JSON.stringify(recentPolls));
    }

    // Load user Google Forms from localStorage, filter to last 7 days
    const savedUserGoogleForms = localStorage.getItem("userGoogleForms");
    if (savedUserGoogleForms) {
      const forms = JSON.parse(savedUserGoogleForms);
      const now = new Date().getTime();
      const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;
      const recentForms = forms.filter((form) => form.timestamp > sevenDaysAgo);
      setUserGoogleForms(recentForms);
      // Update localStorage with filtered forms
      localStorage.setItem("userGoogleForms", JSON.stringify(recentForms));
    }
  }, []);

  const voteDailyPoll = (option) => {
    const newVotes = { ...dailyPoll.votes };
    newVotes[option] = (newVotes[option] || 0) + 1;
    const updatedPoll = { ...dailyPoll, votes: newVotes };
    setDailyPoll(updatedPoll);
    localStorage.setItem("dailyPollVotes", JSON.stringify(newVotes));
  };

  const voteUserPoll = (pollId, option) => {
    const updatedPolls = userPolls.map((poll) => {
      if (poll.id === pollId) {
        const newVotes = { ...poll.votes };
        newVotes[option] = (newVotes[option] || 0) + 1;
        return { ...poll, votes: newVotes };
      }
      return poll;
    });
    setUserPolls(updatedPolls);
    localStorage.setItem("userPolls", JSON.stringify(updatedPolls));
  };

  const addUserPoll = () => {
    if (newPollQuestion.trim() && newPollOptions.filter((opt) => opt.trim()).length >= 2) {
      const newPoll = {
        id: Date.now(),
        question: newPollQuestion,
        options: newPollOptions.filter((opt) => opt.trim()),
        votes: {},
        timestamp: new Date().getTime(),
      };
      const updatedPolls = [...userPolls, newPoll];
      setUserPolls(updatedPolls);
      localStorage.setItem("userPolls", JSON.stringify(updatedPolls));
      setNewPollQuestion("");
      setNewPollOptions(["", ""]);
    }
  };

  const addOption = () => {
    setNewPollOptions([...newPollOptions, ""]);
  };

  const updateOption = (index, value) => {
    const updatedOptions = [...newPollOptions];
    updatedOptions[index] = value;
    setNewPollOptions(updatedOptions);
  };

  const addUserGoogleForm = () => {
    if (newGoogleFormLink.trim() && newGoogleFormLink.startsWith("https://docs.google.com/forms/")) {
      const newForm = {
        id: Date.now(),
        link: newGoogleFormLink,
        timestamp: new Date().getTime(),
      };
      const updatedForms = [...userGoogleForms, newForm];
      setUserGoogleForms(updatedForms);
      localStorage.setItem("userGoogleForms", JSON.stringify(updatedForms));
      setNewGoogleFormLink("");
    } else {
      alert("Please enter a valid Google Forms link.");
    }
  };

  return (
    <section>
      <button className="close-tab-button">×</button>
      <h1>Community Polls</h1>
      <p>Vote on important topics and create your own polls.</p>

      {/* Daily Poll Section */}
      <div className="daily-poll">
        <h2>Daily Poll</h2>
        <p>{dailyPoll.question}</p>
        {dailyPoll.options.map((option) => (
          <button key={option} onClick={() => voteDailyPoll(option)}>
            {option} ({dailyPoll.votes[option] || 0} votes)
          </button>
        ))}
      </div>

      {/* User Polls Section */}
      <div className="user-polls">
        <h2>User Polls</h2>
        {userPolls.length === 0 ? (
          <p>No user polls yet. Create one below!</p>
        ) : (
          userPolls.map((poll) => (
            <div key={poll.id} className="poll">
              <p>{poll.question}</p>
              {poll.options.map((option) => (
                <button key={option} onClick={() => voteUserPoll(poll.id, option)}>
                  {option} ({poll.votes[option] || 0} votes)
                </button>
              ))}
            </div>
          ))
        )}
      </div>

      {/* Google Forms Section */}
      <div className="google-forms">
        <h2>Google Forms</h2>
        <div className="hardcoded-form">
          <h3>Official School Survey</h3>
          <a href={hardcodedGoogleFormLink} target="_blank" rel="noopener noreferrer">
            Take the Survey
          </a>
        </div>
        <div className="user-forms">
          <h3>User-Submitted Forms</h3>
          {userGoogleForms.length === 0 ? (
            <p>No user forms yet. Submit one below!</p>
          ) : (
            userGoogleForms.map((form) => (
              <div key={form.id}>
                <a href={form.link} target="_blank" rel="noopener noreferrer">
                  User Form {form.id}
                </a>
              </div>
            ))
          )}
        </div>
        <div className="submit-form">
          <h3>Submit Your Google Form</h3>
          <input
            type="url"
            placeholder="Enter Google Forms link"
            value={newGoogleFormLink}
            onChange={(e) => setNewGoogleFormLink(e.target.value)}
          />
          <button onClick={addUserGoogleForm}>Submit Form</button>
        </div>
      </div>

      {/* Create Poll Form */}
      <div className="create-poll">
        <h2>Create a New Poll</h2>
        <input
          type="text"
          placeholder="Enter your poll question"
          value={newPollQuestion}
          onChange={(e) => setNewPollQuestion(e.target.value)}
        />
        {newPollOptions.map((option, index) => (
          <input
            key={index}
            type="text"
            placeholder={`Option ${index + 1}`}
            value={option}
            onChange={(e) => updateOption(index, e.target.value)}
          />
        ))}
        <button onClick={addOption}>Add Option</button>
        <button onClick={addUserPoll}>Create Poll</button>
      </div>
    </section>
  );
};

export default PollsTab;
