Requirements: [`virtualenv`](https://virtualenv.pypa.io/), a Fat32-formatted drive to transfer .csv files

OS is [FullPageOS](https://github.com/guysoft/FullPageOS), with the [ITU Studio Broadcast Clock](https://github.com/poulhoi/itu-studio-broadcast-clock) repository cloned into the home folder.

Additional changes:
- in `/home/pi/itu-studio-broadcast-clock/scripts/detect-thumbdrive`,  modify the search term variable to some substring of the usb device name. This term is matched with the output of `lsusb` on the Pi, so run ssh into the Pi and run `lsusb` to find an appropriate search term for your flash drive.
- setting up for the thumbdrive (based on [this guide](https://pimylifeup.com/raspberry-pi-mount-usb-drive/)):
	- `sudo mkdir -p /media/usb1`
	- `sudo chown -R pi:pi /media/usb1`
 - add a line to `.bashrc` for `xdotool` to work:
	 - `export DISPLAY=:0`

- while in `/home/pi/itu-studio-broadcast-clock`, run the following lines to define the virtual environment and install Flask:
	- `virtualenv .venv`
	- `source .venv/bin/activate`
	- `pip install flask`
- add the following line to `/home/pi/scripts/run_onepageos` on line 2 (after the shebang, before the while loop):
	- `/home/pi/itu-studio-broadcast-clock/init_flask &`
	- `/home/pi/itu-studio-broadcast-clock/scripts/detect-thumbdrive &`

 
