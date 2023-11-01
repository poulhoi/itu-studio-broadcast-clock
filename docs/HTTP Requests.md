To change the running state of the broadcast clock, a user must send HTTP POST requests to the server running the application, with form data containing a field `runtime_mode` assigned to a runtime mode string. From the terminal, this is done with the following command:

`curl -X POST http://[ip]:5000/runtime_mode -F "runtime_mode=[mode]"`

where `[ip]` should be replaced by the IP address of the server and `[mode]` should be replaced with a runtime mode string.
A runtime mode string is one of the following words:
- `init`: initialize the clock at 0 and stop it if it is running
- `start`: run the clock from its current point
- `pause`: pauses the clock until it receives a command to start it
- `skip`: skips to the beginning of next segment and run that segment immediately
- `reset`: really just an alias for `init`

For example to start the clock on the ip address `172.18.135.109`, use this command:
	`curl -X POST http://172.18.135.109:5000/runtime_mode -F "runtime_mode=init"`
