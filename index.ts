// App entry. The reminder action task has to be defined before anything else runs, so it
// exists when Android starts the JS bundle headlessly for a Snooze/Close tap.
import './src/features/reminders/action-task';
import 'expo-router/entry';
