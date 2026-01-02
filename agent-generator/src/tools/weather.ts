/**
 * Get the current weather for a given location.
 */
export interface GetWeather {
  /**
   * The city and state, e.g. San Francisco, CA
   */
  location: string;
  /**
   * The unit of temperature to return
   */
  unit?: 'celsius' | 'fahrenheit';
}

/**
 * Get the weather forecast for a given location.
 */
export interface GetForecast {
  /**
   * The city and state, e.g. San Francisco, CA
   */
  location: string;
  /**
   * Number of days to forecast
   */
  days: number;
}
