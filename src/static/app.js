document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");
  const activityCards = new Map();

  function updateActivityCard(activityName) {
    const activityCard = activityCards.get(activityName);
    if (!activityCard) {
      return;
    }

    renderParticipants(activityCard.list, activityCard.participants, activityName);
    const spotsLeft = activityCard.maxParticipants - activityCard.participants.length;
    const availabilityLabel = document.createElement("strong");
    availabilityLabel.textContent = "Availability:";
    activityCard.availability.replaceChildren(
      availabilityLabel,
      ` ${spotsLeft} spots left`
    );
  }

  function renderParticipants(list, participants, activityName) {
    list.replaceChildren();

    if (participants.length === 0) {
      const emptyItem = document.createElement("li");
      emptyItem.textContent = "No participants yet";
      list.appendChild(emptyItem);
      return;
    }

    participants.forEach((participant) => {
      const item = document.createElement("li");
      item.className = "participant-item";
      const email = document.createElement("span");
      email.className = "participant-email";
      email.textContent = participant;

      const removeButton = document.createElement("button");
      removeButton.type = "button";
      removeButton.className = "participant-remove-button";
      removeButton.textContent = "🗑️";
      removeButton.setAttribute(
        "aria-label",
        `Cancel ${participant}'s enrollment in ${activityName}`
      );
      removeButton.addEventListener("click", () =>
        cancelSignup(activityName, participant, removeButton)
      );

      item.append(email, removeButton);
      list.appendChild(item);
    });
  }

  async function cancelSignup(activityName, email, button) {
    button.disabled = true;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activityName)}/cancel?email=${encodeURIComponent(email)}`,
        { method: "POST" }
      );
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.detail || "Failed to cancel signup.");
      }

      const activityCard = activityCards.get(activityName);
      if (activityCard) {
        const participantIndex = activityCard.participants.indexOf(email);
        if (participantIndex !== -1) {
          activityCard.participants.splice(participantIndex, 1);
        }
        updateActivityCard(activityName);
      }

      messageDiv.textContent = result.message;
      messageDiv.className = "success";
      messageDiv.classList.remove("hidden");
      setTimeout(() => messageDiv.classList.add("hidden"), 5000);
    } catch (error) {
      messageDiv.textContent =
        error instanceof Error ? error.message : "Failed to cancel signup.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      button.disabled = false;
      console.error("Error cancelling signup:", error);
    }
  }

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p><strong>Schedule:</strong> ${details.schedule}</p>
          <p class="activity-availability"><strong>Availability:</strong> ${spotsLeft} spots left</p>
        `;

        const participantsHeading = document.createElement("p");
        const participantsLabel = document.createElement("strong");
        participantsLabel.textContent = "Participants:";
        participantsHeading.appendChild(participantsLabel);
        const participantsList = document.createElement("ul");
        participantsList.className = "participants-list";
        renderParticipants(participantsList, details.participants, name);
        activityCard.append(participantsHeading, participantsList);

        activitiesList.appendChild(activityCard);
        activityCards.set(name, {
          participants: [...details.participants],
          list: participantsList,
          availability: activityCard.querySelector(".activity-availability"),
          maxParticipants: details.max_participants,
        });
        updateActivityCard(name);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        const activityCard = activityCards.get(activity);
        if (activityCard) {
          activityCard.participants.push(email);
          updateActivityCard(activity);
        }
        signupForm.reset();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();
});
