import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from '../languages';
import { useTheme } from '../context/ThemeContext';
import SettingsMenu from '../components/SettingsMenu';
import MapService from '../services/MapService';
import MapStorage from '../storage/map.storage';
import LocationService from '../services/LocationService';
import ErrorBanner from '../components/ErrorBanner';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAP_SIZE = SCREEN_WIDTH - 40;

const FILTER_TYPES = {
  ALL: 'all',
  SHELTER: 'shelter',
  HOSPITAL: 'hospital',
  POLICE: 'police',
  STORE: 'store',
  HELP: 'help',
};

// Tokyo Arakawa and Taito region coordinates
const TOKYO_REGION = {
  latitude: 35.7325,
  longitude: 139.7833,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function MapScreen() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [activeFilter, setActiveFilter] = useState(FILTER_TYPES.ALL);
  const [showShelters, setShowShelters] = useState(true);
  const [showHelpRequests, setShowHelpRequests] = useState(true);
  const [allShelters, setAllShelters] = useState([]);
  const [allHelpRequests, setAllHelpRequests] = useState([]);
  const [mapImageLoaded, setMapImageLoaded] = useState(false);
  const [mapImageError, setMapImageError] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [mapRegion, setMapRegion] = useState(TOKYO_REGION);
  const [selectedLocation, setSelectedLocation] = useState(null);
  const [markersLoaded, setMarkersLoaded] = useState(true); // Start as loaded for debugging
  const loadTimeoutRef = useRef(null);

  // Initial loading state - show until markers are loaded
  if (!markersLoaded) {
    return (
      <SafeAreaView style={[styles.container, styles.initialLoadingContainer]} edges={['top']}>
        <ActivityIndicator size="large" color={theme.primary || '#2196F3'} />
        <Text style={styles.initialLoadingText}>
          {t('map.loadingMap') || 'Loading map...'}
        </Text>
      </SafeAreaView>
    );
  }

  // Map background JSX (uses styles)
  const mapBackgroundElement = useMemo(() => {
    if (!styles || !styles.mapBackground) return null;
    return (
      <View style={styles.mapBackground}>
        {[...Array(5)].map((_, i) => (
          <View key={`h-${i}`} style={[styles.gridLine, styles.horizontalLine, { top: `${(i + 1) * 20}%` }]} />
        ))}
        {[...Array(5)].map((_, i) => (
          <View key={`v-${i}`} style={[styles.gridLine, styles.verticalLine, { left: `${(i + 1) * 20}%` }]} />
        ))}
        <View style={styles.centerMarker}>
          <View style={styles.centerHorizontal} />
          <View style={styles.centerVertical} />
        </View>
      </View>
    );
  }, [styles]);

  const fetchUserLocation = useCallback(async () => {
    try {
      setLoadingLocation(true);
      setLocationError(null);
      const permissions = await LocationService.requestPermissions();

      if (permissions.foreground) {
        const result = await LocationService.getCurrentLocation();
        if (result.success) {
          const loc = {
            latitude: result.location.latitude,
            longitude: result.location.longitude,
            accuracy: result.location.accuracy,
          };
          setUserLocation(loc);
          setLocationError(null);
          // Center on user location and persist
          const nextRegion = {
            latitude: loc.latitude,
            longitude: loc.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          };
          setMapRegion(nextRegion);
          MapStorage.saveLastRegion(nextRegion);
        } else {
          setLocationError(t('map.locationError'));
        }
      } else {
        setLocationError(t('map.locationPermissionDenied'));
      }
    } catch (error) {
          console.error('Error getting user location:', error);
      setLocationError(t('map.locationError'));
    } finally {
      setLoadingLocation(false);
    }
  }, [t]);

  useEffect(() => {
    fetchUserLocation();
  }, [fetchUserLocation]);

  // Fallback to default cache
  useEffect(() => {
    // Start timeout immediately
    loadTimeoutRef.current = setTimeout(() => {
      console.log('[MapScreen] Timeout triggered');
      setMarkersLoaded(true);
    }, 5000);

    const loadMarkers = async () => {
      try {
        console.log('[MapScreen] Loading from MapStorage...');
        const state = await MapStorage.load();
        console.log('[MapScreen] MapStorage loaded, has data:', !!(state.shelters?.length || state.helpRequests?.length));

        if (state.shelters?.length || state.helpRequests?.length) {
          setAllShelters(state.shelters || []);
          setAllHelpRequests(state.helpRequests || []);
        } else {
          console.log('[MapScreen] Loading default markers...');
          const defaultShelters = await MapService.getShelterMarkers();
          const defaultHelp = MapService.getHelpRequestMarkers();
          console.log('[MapScreen] Default markers loaded');
          setAllShelters(defaultShelters);
          setAllHelpRequests(defaultHelp);
          MapStorage.save({ shelters: defaultShelters, helpRequests: defaultHelp }).catch(() => {});
        }
      } catch (error) {
        console.error('[MapScreen] Load error:', error);
      }
      // Markers loaded regardless of success/failure
      console.log('[MapScreen] Setting markersLoaded to true');
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
      setMarkersLoaded(true);
    };

    loadMarkers();

    return () => {
      if (loadTimeoutRef.current) {
        clearTimeout(loadTimeoutRef.current);
      }
    };
  }, []);

  // Restore region
  useEffect(() => {
    let isMounted = true;
    MapStorage.loadLastRegion().then((saved) => {
      if (isMounted && saved) setMapRegion(saved);
    });
    return () => { isMounted = false; };
  }, []);

  useEffect(() => {
    return () => {
      MapStorage.saveLastRegion(mapRegion);
    };
  }, [mapRegion]);

  const { shelters, helpRequests } = useMemo(() => {
    let filteredShelters = allShelters;
    let filteredHelpRequests = allHelpRequests;

    // Apply filter conditions first
    if (activeFilter === FILTER_TYPES.HELP) {
      filteredShelters = [];
    } else if (activeFilter !== FILTER_TYPES.ALL) {
      filteredShelters = allShelters.filter((shelter) => shelter.type === activeFilter);
    }

    if (activeFilter !== FILTER_TYPES.ALL && activeFilter !== FILTER_TYPES.HELP) {
      filteredHelpRequests = [];
    }

    // Then apply layer toggles
    if (!showShelters) {
      filteredShelters = [];
    }
    if (!showHelpRequests) {
      filteredHelpRequests = [];
    }

    return {
      shelters: filteredShelters,
      helpRequests: filteredHelpRequests,
    };
  }, [activeFilter, showShelters, showHelpRequests, allShelters, allHelpRequests]);

  const getPositionFromCoordinates = (lat, lng) => {
    const latRange = mapRegion.latitudeDelta ?? 0.05;
    const lngRange = mapRegion.longitudeDelta ?? 0.05;
    const centerLat = mapRegion.latitude;
    const centerLng = mapRegion.longitude;
    const x = ((lng - centerLng + lngRange / 2) / lngRange) * 100;
    const y = ((centerLat - lat + latRange / 2) / latRange) * 100;
    return { x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) };
  };

  const calculateDistanceMeters = (lat1, lon1, lat2, lon2) => {
    const R = 6371000;
    const toRad = (deg) => (deg * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleSelectShelter = (shelter) => {
    const position = getPositionFromCoordinates(shelter.latitude, shelter.longitude);
    let distanceKm = null;
    if (userLocation) {
      const meters = calculateDistanceMeters(
        userLocation.latitude,
        userLocation.longitude,
        shelter.latitude,
        shelter.longitude
      );
      distanceKm = meters / 1000;
    }
    setSelectedLocation({
      kind: 'shelter',
      id: shelter.id,
      name: shelter.name,
      nameEn: shelter.nameEn,
      area: shelter.area,
      address: shelter.address,
      phone: shelter.phone,
      capacity: shelter.capacity,
      facilities: shelter.facilities,
      distanceKm,
      position,
    });
  };

  const handleSelectHelpRequest = (request) => {
    const position = getPositionFromCoordinates(request.latitude, request.longitude);
    let distanceKm = null;
    if (userLocation) {
      const meters = calculateDistanceMeters(
        userLocation.latitude,
        userLocation.longitude,
        request.latitude,
        request.longitude
      );
      distanceKm = meters / 1000;
    }
    setSelectedLocation({
      kind: 'help',
      id: request.id,
      user: request.user,
      content: request.content,
      area: request.area,
      urgent: request.urgent,
      time: request.time,
      distanceKm,
      position,
    });
  };

  const handleSelectUserLocation = () => {
    if (!userLocation) return;
    const position = getPositionFromCoordinates(userLocation.latitude, userLocation.longitude);
    setSelectedLocation({
      kind: 'user',
      id: 'user-location',
      name: t('map.yourLocation') || 'Your location',
      distanceKm: 0,
      position,
    });
  };


  // Static map Google Mapbox OSM default OSM
  const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY';
  
  const MAPBOX_ACCESS_TOKEN = 'YOUR_MAPBOX_ACCESS_TOKEN';

  // Static example points for generating static map markers
  const shelterCoordinates = [
    { lat: 35.7325, lng: 139.7833, label: 'A' }, // Arakawa Ward Office
    { lat: 35.7400, lng: 139.7900, label: 'B' }, // Arakawa Elementary
    { lat: 35.7200, lng: 139.7750, label: 'C' }, // Taito Ward Office
    { lat: 35.7150, lng: 139.7700, label: 'D' }, // Ueno Park
    { lat: 35.7100, lng: 139.7950, label: 'E' }, // Senso-ji Temple
  ];

  // Static help request coordinates
  const helpRequestCoordinates = [
    { lat: 35.7350, lng: 139.7850 }, // Yamada Taro
    { lat: 35.7250, lng: 139.7800 }, // Sato Hanako
    { lat: 35.7380, lng: 139.7880 }, // Tanaka Ichiro
    { lat: 35.7200, lng: 139.7750 }, // Suzuki Misaki
  ];

  // URL Google Static Map
  const getGoogleMapsStaticUrl = () => {
    const center = `${mapRegion.latitude},${mapRegion.longitude}`;
    const zoom = 14;
    const size = `${MAP_SIZE}x${MAP_SIZE}`;
    
    // Build markers
    let markers = '';
    // Green markers shelters
    shelterCoordinates.forEach((coord, index) => {
      markers += `&markers=color:green|label:${String.fromCharCode(65 + index)}|${coord.lat},${coord.lng}`;
    });
    // Red markers for help requests
    helpRequestCoordinates.forEach((coord) => {
      markers += `&markers=color:red|${coord.lat},${coord.lng}`;
    });

    return `https://maps.googleapis.com/maps/api/staticmap?center=${center}&zoom=${zoom}&size=${size}&maptype=roadmap${markers}&key=${GOOGLE_MAPS_API_KEY}`;
  };

  // URL Mapbox Static Map
  const getMapboxStaticUrl = () => {
    const center = `${mapRegion.longitude},${mapRegion.latitude}`;
    const zoom = 14;
    const size = `${MAP_SIZE}x${MAP_SIZE}`;

    // Build markers Mapbox uses GeoJSON format
    let markers = '';
    // Green markers shelters
    shelterCoordinates.forEach((coord, index) => {
      markers += `pin-s-shelter+4CAF50(${coord.lng},${coord.lat}),`;
    });
    // Red markers help requests
    helpRequestCoordinates.forEach((coord) => {
      markers += `pin-s-help+F44336(${coord.lng},${coord.lat}),`;
    });
    markers = markers.slice(0, -1); // Remove trailing comma

    return `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${markers}/${center},${zoom}/${size}@2x?access_token=${MAPBOX_ACCESS_TOKEN}`;
  };

  const getOpenStreetMapTileUrl = () => {
    const lat = mapRegion.latitude;
    const lon = mapRegion.longitude;
    const zoom = 13;

    const n = Math.pow(2, zoom);
    const xtile = Math.floor((lon + 180) / 360 * n);
    const ytile = Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * n);

    const url = `https://tile.openstreetmap.org/${zoom}/${xtile}/${ytile}.png`;
    console.log('OpenStreetMap Tile URL:', url);
    return url;
  };

  const getOpenStreetMapStaticUrl = () => {
    const center = `${mapRegion.latitude},${mapRegion.longitude}`;
    const zoom = 13;
    const size = `${Math.floor(MAP_SIZE)}x${Math.floor(MAP_SIZE)}`;
    const services = [
      `https://staticmap.openstreetmap.de/staticmap.php?center=${center}&zoom=${zoom}&size=${size}&maptype=mapnik`,
      `https://maps.geoapify.com/v1/staticmap?style=osm-bright&width=${Math.floor(MAP_SIZE)}&height=${Math.floor(MAP_SIZE)}&center=lonlat:${mapRegion.longitude},${mapRegion.latitude}&zoom=${zoom}&apiKey=YOUR_API_KEY`,
    ];
    
    const url = services[0];
    console.log('OpenStreetMap Static URL:', url);
    return url;
  };

  const getStaticMapUrl = () => {
    const uri = getStaticMapUrl();

    // Show placeholder if map failed to load
    if (mapImageError) {
      return (
        <View style={styles.mapPlaceholderBackground}>
          <Text style={styles.mapErrorText}>
            {t('map.imageLoadError') || 'Map image failed to load, showing markers only'}
          </Text>
        </View>
      );
    }

    return (
      <>
        <Image
          source={{ uri }}
          style={styles.mapPlaceholderBackground}
          resizeMode="cover"
          onLoad={() => {
            console.log('Map image loaded');
            setMapImageLoaded(true);
          }}
          onError={(error) => {
            console.error('Map image failed:', error.nativeEvent.error);
            setMapImageError(true);
          }}
        />
        {/* Loading overlay */}
        {!mapImageLoaded && (
          <View style={[styles.mapPlaceholderBackground, styles.mapLoadingOverlay]}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.mapLoadingText}>
              {t('map.loadingMap') || 'Loading map...'}
            </Text>
          </View>
        )}
      </>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.headerTop}>
        <View style={styles.headerSpacer} />
        <SettingsMenu variant="compact" />
      </View>
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: theme.card }]}>
          <Text style={[styles.title, { color: theme.text }]}>{t('map.title')}</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>{t('map.subtitle')}</Text>
        </View>

        {/* Filter */}
        <View style={[styles.filterContainer, { backgroundColor: theme.card }]}>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterScrollContent}
          >
            <TouchableOpacity
              style={[
                styles.filterButton,
                {
                  backgroundColor: activeFilter === FILTER_TYPES.ALL ? theme.secondary : theme.backgroundSecondary,
                  borderColor: activeFilter === FILTER_TYPES.ALL ? theme.secondary : theme.border
                }
              ]}
              onPress={() => setActiveFilter(FILTER_TYPES.ALL)}
              accessibilityRole="button"
              accessibilityLabel={t('map.filter.all')}
            >
              <Text style={[
                styles.filterButtonText,
                { color: activeFilter === FILTER_TYPES.ALL ? theme.backgroundSecondary : theme.textSecondary }
              ]}>
                {t('map.filter.all')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                {
                  backgroundColor: activeFilter === FILTER_TYPES.SHELTER ? theme.secondary : theme.backgroundSecondary,
                  borderColor: activeFilter === FILTER_TYPES.SHELTER ? theme.secondary : theme.border
                }
              ]}
              onPress={() => setActiveFilter(FILTER_TYPES.SHELTER)}
              accessibilityRole="button"
              accessibilityLabel={t('map.filter.shelter')}
            >
              <Text style={[
                styles.filterButtonText,
                { color: activeFilter === FILTER_TYPES.SHELTER ? theme.backgroundSecondary : theme.textSecondary }
              ]}>
                {t('map.filter.shelter')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                {
                  backgroundColor: activeFilter === FILTER_TYPES.HOSPITAL ? theme.secondary : theme.backgroundSecondary,
                  borderColor: activeFilter === FILTER_TYPES.HOSPITAL ? theme.secondary : theme.border
                }
              ]}
              onPress={() => setActiveFilter(FILTER_TYPES.HOSPITAL)}
              accessibilityRole="button"
              accessibilityLabel={t('map.filter.hospital')}
            >
              <Text style={[
                styles.filterButtonText,
                { color: activeFilter === FILTER_TYPES.HOSPITAL ? theme.backgroundSecondary : theme.textSecondary }
              ]}>
                {t('map.filter.hospital')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.filterButton,
                {
                  backgroundColor: activeFilter === FILTER_TYPES.HELP ? theme.secondary : theme.backgroundSecondary,
                  borderColor: activeFilter === FILTER_TYPES.HELP ? theme.secondary : theme.border
                }
              ]}
              onPress={() => setActiveFilter(FILTER_TYPES.HELP)}
              accessibilityRole="button"
              accessibilityLabel={t('map.filter.help')}
            >
              <Text style={[
                styles.filterButtonText,
                { color: activeFilter === FILTER_TYPES.HELP ? theme.backgroundSecondary : theme.textSecondary }
              ]}>
                {t('map.filter.help')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        </View>

        {/* Map */}
        <View style={styles.mapContainer}>
          {/* Location error retry */}
          {locationError && (
            <ErrorBanner
              type="location"
              message={locationError}
              onRetry={() => fetchUserLocation()}
            />
          )}
          {/* Loading location */}
          {loadingLocation && !locationError && (
            <View style={[styles.locationLoadingContainer, { backgroundColor: theme.primaryLight || '#E3F2FD' }]}>
              <ActivityIndicator size="small" color={theme.primary || '#2196F3'} />
              <Text style={[styles.locationLoadingText, { color: theme.primary || '#1976D2' }]}>{t('map.loadingLocation')}</Text>
            </View>
          )}

          {/* Static map markers overlay */}
          <View style={[styles.map, { width: MAP_SIZE, height: MAP_SIZE }]}>
            {/* Map background */}
            {mapBackgroundElement}
            
            {/* Markers overlay */}
            {/* User location clickable */}
            {userLocation && (() => {
              const position = getPositionFromCoordinates(userLocation.latitude, userLocation.longitude);
              return (
                <TouchableOpacity
                  key="user-location"
                  activeOpacity={0.85}
                  onPress={handleSelectUserLocation}
                  accessibilityRole="button"
                  accessibilityLabel={t('map.yourLocation') || 'Your location'}
                  style={[
                    styles.marker,
                    styles.userMarker,
                    {
                      left: `${position.x}%`,
                      top: `${position.y}%`,
                    },
                  ]}
                >
                  <View style={[styles.markerDot, styles.userMarkerDot]} />
                  <View style={styles.markerLabel}>
                    <Text style={styles.markerText}>{t('map.you') || '你'}</Text>
                  </View>
                </TouchableOpacity>
              );
            })()}

            {/* Shelters facilities markers */}
            {shelters.map((shelter) => {
              const position = getPositionFromCoordinates(shelter.latitude, shelter.longitude);
              let markerStyle = styles.shelterMarker;
              let dotStyle = styles.markerDot;
              
              if (shelter.type === 'hospital') {
                markerStyle = styles.hospitalMarker;
                dotStyle = styles.hospitalDot;
              } else if (shelter.type === 'police') {
                markerStyle = styles.policeMarker;
                dotStyle = styles.policeDot;
              } else if (shelter.type === 'store') {
                markerStyle = styles.storeMarker;
                dotStyle = styles.storeDot;
              }

              return (
                <TouchableOpacity
                  key={`shelter-${shelter.id}`}
                  activeOpacity={0.85}
                  onPress={() => handleSelectShelter(shelter)}
                  style={[
                    styles.marker,
                    markerStyle,
                    {
                      left: `${position.x}%`,
                      top: `${position.y}%`,
                    },
                  ]}
                >
                  <View style={[styles.markerDot, dotStyle]} />
                  <View style={styles.markerLabel}>
                    <Text style={styles.markerText} numberOfLines={1}>
                      {shelter.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {/* Help request markers */}
            {helpRequests.map((request) => {
              const position = getPositionFromCoordinates(request.latitude, request.longitude);
              return (
                <TouchableOpacity
                  key={`help-${request.id}`}
                  activeOpacity={0.85}
                  onPress={() => handleSelectHelpRequest(request)}
                  style={[
                    styles.marker,
                    styles.helpMarker,
                    {
                      left: `${position.x}%`,
                      top: `${position.y}%`,
                    },
                  ]}
                >
                  <View style={[styles.markerDot, styles.helpMarkerDot, request.urgent && styles.urgentMarker]} />
                  <View style={styles.markerLabel}>
                    <Text style={styles.markerText} numberOfLines={1}>
                      {request.user}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}

            {selectedLocation && selectedLocation.position && (
              <View
                pointerEvents="box-none"
                style={[
                  styles.detailCardWrapper,
                  {
                    left: `${selectedLocation.position.x}%`,
                    top: `${Math.min(selectedLocation.position.y + 8, 88)}%`,
                  },
                ]}
              >
                <View style={[styles.detailCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
                  <View style={styles.detailTitleRow}>
                    <Text style={[styles.detailTitle, { color: theme.text }]}>
                      {selectedLocation.kind === 'shelter'
                        ? selectedLocation.name
                        : selectedLocation.user}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setSelectedLocation(null)}
                      style={styles.detailClose}
                      accessibilityRole="button"
                      accessibilityLabel={t('common.close')}
                    >
                      <Text style={[styles.detailCloseText, { color: theme.textSecondary }]}>
                        {t('common.close')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {selectedLocation.kind === 'shelter' && (
                    <>
                      {selectedLocation.address && (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                            {t('map.detail.address')}：
                          </Text>
                          <Text style={[styles.detailValue, { color: theme.text }]}>
                            {selectedLocation.address}
                          </Text>
                        </View>
                      )}
                      {selectedLocation.area && (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                            {t('map.area')}：
                          </Text>
                          <Text style={[styles.detailValue, { color: theme.text }]}>
                            {selectedLocation.area}
                          </Text>
                        </View>
                      )}
                      {typeof selectedLocation.capacity === 'number' && (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                            {t('map.detail.capacity')}：
                          </Text>
                          <Text style={[styles.detailValue, { color: theme.text }]}>
                            {selectedLocation.capacity} {t('map.detail.peopleUnit')}
                          </Text>
                        </View>
                      )}
                      {Array.isArray(selectedLocation.facilities) && selectedLocation.facilities.length > 0 && (
                        <View style={styles.detailFacilitiesRow}>
                          <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                            {t('map.detail.facilities')}：
                          </Text>
                          <View style={styles.detailChipsRow}>
                            {selectedLocation.facilities.map((f, index) => (
                              <View
                                key={index}
                                style={[styles.detailChip, { backgroundColor: theme.surfaceSecondary }]}
                              >
                                <Text style={[styles.detailChipText, { color: theme.textSecondary }]}>
                                  {f}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}
                      {selectedLocation.phone && (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                            {t('map.detail.phone')}：
                          </Text>
                          <Text style={[styles.detailValue, { color: theme.text }]}>
                            {selectedLocation.phone}
                          </Text>
                        </View>
                      )}
                    </>
                  )}

                  {selectedLocation.kind === 'help' && (
                    <>
                      {selectedLocation.content && (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                            {t('map.helpRequests')}：
                          </Text>
                          <Text style={[styles.detailValue, { color: theme.text }]}>
                            {selectedLocation.content}
                          </Text>
                        </View>
                      )}
                      {selectedLocation.area && (
                        <View style={styles.detailRow}>
                          <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                            {t('map.area')}：
                          </Text>
                          <Text style={[styles.detailValue, { color: theme.text }]}>
                            {selectedLocation.area}
                          </Text>
                        </View>
                      )}
                      <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: theme.textSecondary }]}>
                          {t('map.minutesAgo')}：
                        </Text>
                        <Text style={[styles.detailValue, { color: theme.text }]}>
                          {selectedLocation.time} {t('map.minutesAgo')}
                        </Text>
                      </View>
                    </>
                  )}

                  {typeof selectedLocation.distanceKm === 'number' && (
                    <Text style={[styles.detailDistance, { color: theme.textSecondary }]}>
                      {t('map.detail.distance')}：{selectedLocation.distanceKm.toFixed(1)} km {t('map.detail.fromYou')}
                    </Text>
                  )}
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Legend */}
        <View style={[styles.legend, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.legendTitle, { color: theme.text }]}>{t('map.legend')}</Text>
          <View style={styles.legendItems}>
            {/* Shelter layer toggle */}
            <View style={styles.legendItemWithSwitch}>
              <View style={styles.legendItemLeft}>
                <View style={[styles.legendDot, styles.shelterDot, { borderColor: theme.card }]} />
                <Text style={[styles.legendText, { color: theme.textSecondary }]}>{t('map.shelterLocations')}</Text>
              </View>
              <TouchableOpacity
                style={[styles.layerSwitch, showShelters && styles.layerSwitchActive]}
                onPress={() => setShowShelters(!showShelters)}
                accessibilityRole="switch"
                accessibilityLabel={t('map.shelterLocations')}
                accessibilityState={{ checked: showShelters }}
              >
                <View style={[styles.layerSwitchThumb, showShelters && styles.layerSwitchThumbActive]} />
              </TouchableOpacity>
            </View>
            {/* Help request layer toggle */}
            <View style={styles.legendItemWithSwitch}>
              <View style={styles.legendItemLeft}>
                <View style={[styles.legendDot, styles.helpDot, { borderColor: theme.card }]} />
                <Text style={[styles.legendText, { color: theme.textSecondary }]}>{t('map.helpRequests')}</Text>
              </View>
              <TouchableOpacity
                style={[styles.layerSwitch, showHelpRequests && styles.layerSwitchActive]}
                onPress={() => setShowHelpRequests(!showHelpRequests)}
                accessibilityRole="switch"
                accessibilityLabel={t('map.helpRequests')}
                accessibilityState={{ checked: showHelpRequests }}
              >
                <View style={[styles.layerSwitchThumb, showHelpRequests && styles.layerSwitchThumbActive]} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* List */}
        <View style={styles.locationsList}>
          <View style={styles.locationSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('map.shelterLocations')} ({shelters.length})</Text>
            {shelters.map((shelter) => {
              let iconStyle = styles.shelterIcon;
              let iconText = 'S';
              if (shelter.type === 'hospital') {
                iconStyle = styles.hospitalIcon;
                iconText = 'H';
              } else if (shelter.type === 'police') {
                iconStyle = styles.policeIcon;
                iconText = 'P';
              } else if (shelter.type === 'store') {
                iconStyle = styles.storeIcon;
                iconText = 'S';
              } else if (shelter.type === 'school') {
                iconStyle = styles.schoolIcon;
                iconText = 'E';
              }

              return (
                <TouchableOpacity
                  key={shelter.id}
                  activeOpacity={0.85}
                  onPress={() => handleSelectShelter(shelter)}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('map.shelterLocations')}: ${shelter.name}`}
                  style={[
                    styles.locationCard,
                    { backgroundColor: theme.card, borderColor: theme.border },
                    selectedLocation?.kind === 'shelter' &&
                      selectedLocation?.id === shelter.id &&
                      styles.locationCardSelected,
                  ]}
                >
                  <View style={[styles.locationIcon, iconStyle]}>
                    <Text style={styles.locationIconText}>{iconText}</Text>
                  </View>
                  <View style={styles.locationInfo}>
                    <Text style={[styles.locationName, { color: theme.text }]}>{shelter.name}</Text>
                    <Text style={[styles.locationArea, { color: theme.textSecondary }]}>{t('map.area')}: {shelter.area}</Text>
                    {shelter.tags && shelter.tags.length > 0 && (
                      <View style={styles.tagsContainer}>
                        {shelter.tags.slice(0, 3).map((tag, index) => (
                          <View key={index} style={[styles.tag, { backgroundColor: theme.surfaceSecondary }]}>
                            <Text style={[styles.tagText, { color: theme.textSecondary }]}>{tag}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.locationSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>{t('map.helpRequests')} ({helpRequests.length})</Text>
            {helpRequests.map((request) => (
              <TouchableOpacity
                key={request.id}
                activeOpacity={0.85}
                onPress={() => handleSelectHelpRequest(request)}
                accessibilityRole="button"
                accessibilityLabel={`${t('map.helpRequests')}: ${request.user}`}
                style={[
                  styles.locationCard,
                  { backgroundColor: theme.card, borderColor: theme.border },
                  request.urgent && styles.urgentCard,
                  selectedLocation?.kind === 'help' &&
                    selectedLocation?.id === request.id &&
                    styles.locationCardSelected,
                ]}
              >
                <View style={[styles.locationIcon, styles.helpIcon, request.urgent && styles.urgentIcon]}>
                  <Text style={styles.locationIconText}>H</Text>
                </View>
                <View style={styles.locationInfo}>
                  <View style={styles.requestHeader}>
                    <Text style={[styles.locationName, { color: theme.text }]}>{request.user}</Text>
                    {request.urgent && (
                      <View style={styles.urgentBadge}>
                        <Text style={styles.urgentBadgeText}>{t('map.urgent')}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={[styles.requestContent, { color: theme.textSecondary }]}>{request.content}</Text>
                  <View style={styles.requestFooter}>
                    <Text style={[styles.locationArea, { color: theme.textSecondary }]}>{t('map.area')}: {request.area}</Text>
                    <Text style={[styles.requestTime, { color: theme.textTertiary }]}>{request.time} {t('map.minutesAgo')}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const createStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme?.background || '#F5F5F5',
  },
  initialLoadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialLoadingText: {
    marginTop: 12,
    fontSize: 15,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme?.border || '#E5E5EA',
  },
  headerSpacer: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme?.border || '#E5E5EA',
  },
  filterContainer: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: theme?.border || '#E0D9CF',
  },
  filterScrollContent: {
    paddingRight: 20,
  },
  filterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: '500',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 10,
  },
  mapContainer: {
    padding: 20,
    alignItems: 'center',
  },
  map: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: theme?.border || '#E5E5EA',
    position: 'relative',
    overflow: 'visible',
  },
  mapBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  gridLine: {
    position: 'absolute',
    backgroundColor: theme?.border || '#E0E0E0',
  },
  horizontalLine: {
    left: 0,
    right: 0,
    height: StyleSheet.hairlineWidth,
  },
  verticalLine: {
    top: 0,
    bottom: 0,
    width: StyleSheet.hairlineWidth,
  },
  centerMarker: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 20,
    height: 20,
    marginLeft: -10,
    marginTop: -10,
  },
  centerHorizontal: {
    position: 'absolute',
    top: '50%',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: theme?.primary || '#2196F3',
  },
  centerVertical: {
    position: 'absolute',
    left: '50%',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: theme?.primary || '#2196F3',
  },
  mapPlaceholderBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
  },
  mapLoadingOverlay: {
    backgroundColor: theme?.card ? `${theme.card}E6` : 'rgba(255, 255, 255, 0.9)',
  },
  mapLoadingText: {
    marginTop: 12,
    fontSize: 14,
    color: theme?.textSecondary || '#666',
  },
  mapErrorText: {
    fontSize: 14,
    textAlign: 'center',
    padding: 20,
    color: theme?.textSecondary || '#666',
  },
  marker: {
    position: 'absolute',
    alignItems: 'center',
    zIndex: 10,
  },
  markerDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: theme?.success || '#4CAF50',
    borderWidth: 2,
    borderColor: theme?.card || '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
  helpMarkerDot: {
    backgroundColor: theme?.error || '#F44336',
  },
  userMarker: {},
  userMarkerDot: {
    backgroundColor: theme?.primary || '#2196F3',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
    borderColor: theme?.card || '#fff',
  },
  locationLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  locationLoadingText: {
    marginLeft: 8,
    fontSize: 14,
  },
  userLocationInfo: {
    padding: 12,
    backgroundColor: theme?.primaryLight || '#E8F5E9',
    borderRadius: 8,
    marginBottom: 12,
  },
  userLocationText: {
    fontSize: 14,
    color: theme?.success || '#2E7D32',
    fontWeight: '500',
    marginBottom: 4,
  },
  userLocationAccuracy: {
    fontSize: 12,
    color: theme?.textSecondary || '#558B2F',
  },
  urgentMarker: {
    backgroundColor: theme?.error || '#D32F2F',
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 3,
  },
  markerLabel: {
    marginTop: 4,
    backgroundColor: theme?.card ? `${theme.card}F2` : 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: theme?.border || '#E5E5EA',
    maxWidth: 80,
  },
  markerText: {
    fontSize: 10,
    color: theme?.text || '#000',
    fontWeight: '500',
    textAlign: 'center',
  },
  legend: {
    marginHorizontal: 20,
    marginTop: 10,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  legendItems: {
    flexDirection: 'column',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  legendItemWithSwitch: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  legendItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  legendDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 2,
  },
  shelterDot: {
    backgroundColor: theme?.success || '#4CAF50',
  },
  helpDot: {
    backgroundColor: theme?.error || '#F44336',
  },
  legendText: {
    fontSize: 14,
  },
  layerSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme?.surfaceSecondary || '#E0D9CF',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  layerSwitchActive: {
    backgroundColor: theme?.secondary || '#7B9FC4',
  },
  layerSwitchThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme?.card || '#FFFFFF',
    marginLeft: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  layerSwitchThumbActive: {
    marginLeft: 20,
  },
  locationsList: {
    padding: 20,
    paddingTop: 10,
  },
  locationSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  locationCard: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  locationIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  shelterIcon: {
    backgroundColor: theme?.success ? `${theme.success}22` : '#E8F5E9',
  },
  hospitalIcon: {
    backgroundColor: theme?.primary ? `${theme.primary}22` : '#BBDEFB',
  },
  policeIcon: {
    backgroundColor: theme?.warning ? `${theme.warning}22` : '#FFE0B2',
  },
  storeIcon: {
    backgroundColor: theme?.surfaceSecondary || '#E1BEE7',
  },
  schoolIcon: {
    backgroundColor: theme?.success ? `${theme.success}33` : '#C8E6C9',
  },
  helpIcon: {
    backgroundColor: theme?.error ? `${theme.error}22` : '#FFEBEE',
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
    marginTop: 4,
  },
  tagText: {
    fontSize: 10,
    fontWeight: '500',
  },
  hospitalMarker: {},
  hospitalDot: {
    backgroundColor: theme?.primary || '#2196F3',
  },
  policeMarker: {},
  policeDot: {
    backgroundColor: theme?.warning || '#FF9800',
  },
  storeMarker: {},
  storeDot: {
    backgroundColor: theme?.secondary || '#9C27B0',
  },
  locationIconText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme?.textOnPrimary || '#FFFFFF',
  },
  locationInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  locationName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  locationArea: {
    fontSize: 14,
  },
  urgentCard: {
    borderColor: theme?.error || '#F44336',
    borderWidth: 2,
  },
  urgentIcon: {
    backgroundColor: theme?.error ? `${theme.error}44` : '#FFCDD2',
  },
  requestHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  requestContent: {
    fontSize: 14,
    marginBottom: 6,
    lineHeight: 20,
  },
  requestFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestTime: {
    fontSize: 12,
  },
  urgentBadge: {
    backgroundColor: theme?.error || '#F44336',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  urgentBadgeText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  locationCardSelected: {
    borderWidth: 2,
    borderColor: theme?.secondary || '#7B9FC4',
  },
  detailCardWrapper: {
    position: 'absolute',
    zIndex: 50,
    width: 240,
    marginLeft: -120,
  },
  detailCard: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailTitle: {
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
    marginRight: 8,
  },
  detailClose: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  detailCloseText: {
    fontSize: 12,
  },
  detailRow: {
    flexDirection: 'row',
    marginTop: 4,
  },
  detailFacilitiesRow: {
    marginTop: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 4,
  },
  detailValue: {
    fontSize: 12,
    flex: 1,
    flexWrap: 'wrap',
  },
  detailChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 4,
  },
  detailChip: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 4,
    marginTop: 4,
  },
  detailChipText: {
    fontSize: 10,
  },
  detailDistance: {
    fontSize: 12,
    marginTop: 8,
  },
});
