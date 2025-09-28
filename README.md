This is a chrome extension that works in tandem with a data_accumulator server. It sends image data along with it's label or class to be stored for ML training.

This extension works as follows:
1) Install it on chrome
2) Setup the options by hitting the chrome extensions button on the top left of chrome, hitting the 3 dots next to Hover-Save, then clicking 'options'. This will give you a popup with all the required fields
3) Fill in the api endpoint you wish to send the data to
4) Password (optional) this is in case your api needs one. Data-accumulator does need one so just put anything random here
5) Set your 4 data classes/labels each coresponding with a particular keyboard shortcut (J plus 7, J plus 8, etc). Even if you need less than 4 classes/labels still put some placeholder in the extra ones.
6) Hit save
7) Go to any page hover your mouse of the image you want and hit the keyboard shortcut corresponding with it's proper label