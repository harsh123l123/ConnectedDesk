const router = require('express').Router();
const Meeting = require('../models/Meeting');
const verify = require('../middleware/auth');

// Get all meetings for user (as organizer or attendee)
router.get('/', verify, async (req, res) => {
  try {
    const meetings = await Meeting.find({
      $or: [{ organizer: req.user._id }, { attendees: req.user._id }]
    }).populate('organizer', 'username').populate('attendees', 'username');
    res.json(meetings);
  } catch (err) {
    res.status(400).send('Error fetching meetings');
  }
});

// Create meeting
router.post('/', verify, async (req, res) => {
  const meeting = new Meeting({
    title: req.body.title,
    description: req.body.description,
    dateTime: req.body.dateTime,
    venue: req.body.venue,
    organizer: req.user._id,
    attendees: req.body.attendees, // Array of User IDs
    agenda: req.body.agenda
  });

  try {
    const savedMeeting = await meeting.save();
    res.json(savedMeeting);
  } catch (err) {
    res.status(400).send('Error creating meeting');
  }
});

// Cancel (Delete) meeting
router.delete('/:id', verify, async (req, res) => {
  try {
    const meeting = await Meeting.findById(req.params.id);

    if (!meeting) return res.status(404).json({ msg: 'Meeting not found' });

    // Check if user is organizer
    if (meeting.organizer.toString() !== req.user._id.toString()) {
      return res.status(401).json({ msg: 'User not authorized to cancel this meeting' });
    }

    await meeting.deleteOne();
    res.json({ msg: 'Meeting cancelled' });
  } catch (err) {
    console.error(err.message);
    res.status(500).send('Server Error');
  }
});

module.exports = router;
