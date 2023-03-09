/**
 * @file Miscellaneous anki connect actions
 *
 * See https://github.com/FooSoft/anki-connect#miscellaneous-actions
 */

export type ActionsToPayloadMap = {
	/**
	 * Requests permission to use the API exposed by this plugin. This method does not require the API
   * key, and is the only one that accepts requests from any origin; the other methods only accept 
   * requests from trusted origins, which are listed under webCorsOriginList in the add-on config. 
   * localhost is trusted by default.
	 */
	requestPermission: {
		6: {
			request: void;
			response: {
				permission: "granted" | "denied";
				requireApiKey: boolean?;
				version: number?;
			};
		};
	};
	/**
	 * Gets the version of the API exposed by this plugin. Currently versions 1 through 6 are defined.
	 */
	version: {
		6: {
			request: void;
			response: number;
		};
	};
	/**
	 * Synchronizes the local Anki collections with AnkiWeb.
	 */
	sync: {
		6: {
			request: void;
			response: void;
		};
	};
	/**
	 * Retrieve the list of profiles.
	 */
	getProfiles: {
		6: {
			request: void;
			response: string[];
		};
	};
	/**
	 * Selects the profile specified in request.
	 */
	loadProfile: {
		6: {
			request: {
        name: string;
      }
			response: boolean;
		};
	};
};
